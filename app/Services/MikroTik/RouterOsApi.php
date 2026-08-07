<?php

namespace App\Services\MikroTik;

use RuntimeException;

/**
 * Minimal RouterOS API client (TCP 8728 / API-SSL 8729).
 * Protokol length-prefixed binary — tanpa dependensi tambahan.
 */
class RouterOsApi
{
    /** @var resource|null */
    protected $socket = null;

    protected bool $connected = false;

    public function connect(
        string $host,
        int $port,
        string $username,
        string $password,
        int $timeout = 15,
        bool $ssl = false,
    ): void {
        $this->disconnect();

        $scheme = $ssl ? 'ssl' : 'tcp';
        $remote = "{$scheme}://{$host}:{$port}";

        $context = stream_context_create([
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false,
                'allow_self_signed' => true,
            ],
        ]);

        $socket = @stream_socket_client(
            $remote,
            $errno,
            $errstr,
            $timeout,
            STREAM_CLIENT_CONNECT,
            $context
        );

        if ($socket === false) {
            throw new RuntimeException("Gagal koneksi API CHR {$host}:{$port} — {$errstr} ({$errno})");
        }

        stream_set_timeout($socket, $timeout);
        $this->socket = $socket;

        // Login RouterOS >= 6.43 (plaintext)
        $reply = $this->command('/login', [
            'name' => $username,
            'password' => $password,
        ]);

        if ($this->hasTrap($reply)) {
            $this->disconnect();
            throw new RuntimeException('Login API CHR gagal: '.$this->trapMessage($reply));
        }

        // Legacy challenge-response (pre-6.43) jika diminta
        foreach ($reply as $sentence) {
            if (($sentence['!type'] ?? '') === '!done' && isset($sentence['ret'])) {
                $challenge = $sentence['ret'];
                $hash = md5(chr(0).$password.pack('H*', $challenge));
                $legacy = $this->command('/login', [
                    'name' => $username,
                    'response' => '00'.$hash,
                ]);
                if ($this->hasTrap($legacy)) {
                    $this->disconnect();
                    throw new RuntimeException('Login API CHR (legacy) gagal: '.$this->trapMessage($legacy));
                }
                break;
            }
        }

        $this->connected = true;
    }

    public function isConnected(): bool
    {
        return $this->connected && is_resource($this->socket);
    }

    /**
     * Jalankan perintah API dan kembalikan baris !re (+ meta).
     *
     * @param  array<string, scalar|null>  $attributes  atribut =key=value
     * @param  list<string>  $queries  filter ?key=value atau ?=key=value
     * @return list<array<string, mixed>>
     */
    public function command(string $path, array $attributes = [], array $queries = []): array
    {
        if (! is_resource($this->socket)) {
            throw new RuntimeException('Socket API CHR belum terhubung.');
        }

        $path = '/'.trim(str_replace('.', '/', $path), '/');
        $words = [$path];

        foreach ($attributes as $key => $value) {
            if ($value === null) {
                continue;
            }
            $words[] = '='.$key.'='.$value;
        }

        foreach ($queries as $query) {
            $words[] = $query;
        }

        $this->writeSentence($words);

        return $this->readSentences();
    }

    /**
     * @return list<array<string, mixed>> hanya baris data (!re)
     */
    public function print(string $path, array $queries = []): array
    {
        $reply = $this->command(rtrim($path, '/').'/print', [], $queries);

        return array_values(array_filter(
            $reply,
            fn (array $row) => ($row['!type'] ?? '') === '!re'
        ));
    }

    public function disconnect(): void
    {
        if (is_resource($this->socket)) {
            fclose($this->socket);
        }
        $this->socket = null;
        $this->connected = false;
    }

    /**
     * @param  list<array<string, mixed>>  $reply
     */
    public function hasTrap(array $reply): bool
    {
        foreach ($reply as $sentence) {
            if (($sentence['!type'] ?? '') === '!trap' || ($sentence['!type'] ?? '') === '!fatal') {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  list<array<string, mixed>>  $reply
     */
    public function trapMessage(array $reply): string
    {
        foreach ($reply as $sentence) {
            if (in_array($sentence['!type'] ?? '', ['!trap', '!fatal'], true)) {
                return (string) ($sentence['message'] ?? $sentence['!type']);
            }
        }

        return 'unknown API error';
    }

    /**
     * @param  list<string>  $words
     */
    protected function writeSentence(array $words): void
    {
        foreach ($words as $word) {
            $this->writeWord((string) $word);
        }
        $this->writeWord(''); // end of sentence
    }

    protected function writeWord(string $word): void
    {
        $this->writeLength(strlen($word));
        if ($word !== '') {
            $written = fwrite($this->socket, $word);
            if ($written === false) {
                throw new RuntimeException('Gagal menulis ke socket API CHR.');
            }
        }
    }

    protected function writeLength(int $length): void
    {
        if ($length < 0x80) {
            $payload = chr($length);
        } elseif ($length < 0x4000) {
            $length |= 0x8000;
            $payload = chr(($length >> 8) & 0xFF).chr($length & 0xFF);
        } elseif ($length < 0x200000) {
            $length |= 0xC00000;
            $payload = chr(($length >> 16) & 0xFF).chr(($length >> 8) & 0xFF).chr($length & 0xFF);
        } elseif ($length < 0x10000000) {
            $length |= 0xE0000000;
            $payload = chr(($length >> 24) & 0xFF).chr(($length >> 16) & 0xFF)
                .chr(($length >> 8) & 0xFF).chr($length & 0xFF);
        } else {
            $payload = chr(0xF0)
                .chr(($length >> 24) & 0xFF)
                .chr(($length >> 16) & 0xFF)
                .chr(($length >> 8) & 0xFF)
                .chr($length & 0xFF);
        }

        if (fwrite($this->socket, $payload) === false) {
            throw new RuntimeException('Gagal menulis panjang word API CHR.');
        }
    }

    /**
     * @return list<array<string, mixed>>
     */
    protected function readSentences(): array
    {
        $sentences = [];
        $current = ['!type' => ''];

        while (true) {
            $word = $this->readWord();

            if ($word === '') {
                if ($current['!type'] !== '' || count($current) > 1) {
                    $sentences[] = $current;
                }
                $type = $current['!type'] ?? '';
                if (in_array($type, ['!done', '!trap', '!fatal'], true)) {
                    break;
                }
                $current = ['!type' => ''];
                continue;
            }

            if (str_starts_with($word, '!')) {
                if ($current['!type'] !== '' || count($current) > 1) {
                    $sentences[] = $current;
                }
                $current = ['!type' => $word];
                continue;
            }

            if (str_starts_with($word, '=')) {
                $payload = substr($word, 1);
                $pos = strpos($payload, '=');
                if ($pos === false) {
                    $current[$payload] = '';
                } else {
                    $current[substr($payload, 0, $pos)] = substr($payload, $pos + 1);
                }
            }
        }

        return $sentences;
    }

    protected function readWord(): string
    {
        $length = $this->readLength();
        if ($length === 0) {
            return '';
        }

        $data = '';
        while (strlen($data) < $length) {
            $chunk = fread($this->socket, $length - strlen($data));
            if ($chunk === false || $chunk === '') {
                $meta = stream_get_meta_data($this->socket);
                if (! empty($meta['timed_out'])) {
                    throw new RuntimeException('Timeout membaca respons API CHR.');
                }
                throw new RuntimeException('Koneksi API CHR terputus saat membaca data.');
            }
            $data .= $chunk;
        }

        return $data;
    }

    protected function readLength(): int
    {
        $byte = $this->readByte();
        if ($byte === null) {
            throw new RuntimeException('Koneksi API CHR terputus.');
        }

        if ($byte < 0x80) {
            return $byte;
        }
        if ($byte < 0xC0) {
            return (($byte & ~0xC0) << 8) + $this->readByteOrFail();
        }
        if ($byte < 0xE0) {
            return (($byte & ~0xE0) << 16)
                + ($this->readByteOrFail() << 8)
                + $this->readByteOrFail();
        }
        if ($byte < 0xF0) {
            return (($byte & ~0xF0) << 24)
                + ($this->readByteOrFail() << 16)
                + ($this->readByteOrFail() << 8)
                + $this->readByteOrFail();
        }
        if ($byte === 0xF0) {
            return ($this->readByteOrFail() << 24)
                + ($this->readByteOrFail() << 16)
                + ($this->readByteOrFail() << 8)
                + $this->readByteOrFail();
        }

        throw new RuntimeException('Panjang word API CHR tidak valid.');
    }

    protected function readByte(): ?int
    {
        $char = fread($this->socket, 1);
        if ($char === false || $char === '') {
            return null;
        }

        return ord($char);
    }

    protected function readByteOrFail(): int
    {
        $byte = $this->readByte();
        if ($byte === null) {
            throw new RuntimeException('Koneksi API CHR terputus saat membaca panjang.');
        }

        return $byte;
    }
}
