<?php

namespace App\Services\MikroTik;

use phpseclib3\Net\SSH2;
use RuntimeException;

class ChrClient
{
    protected ?SSH2 $ssh = null;

    public function connect(): SSH2
    {
        if ($this->ssh?->isConnected()) {
            return $this->ssh;
        }

        $host = (string) config('chr.host');
        $port = (int) config('chr.port');
        $username = (string) config('chr.username');
        $password = (string) config('chr.password');

        if ($password === '') {
            throw new RuntimeException('CHR_PASSWORD belum dikonfigurasi di .env');
        }

        $ssh = new SSH2($host, $port, 20);
        if (! $ssh->login($username, $password)) {
            throw new RuntimeException("Gagal login SSH ke CHR {$host}:{$port}");
        }

        $this->ssh = $ssh;

        return $ssh;
    }

    public function run(string $command): string
    {
        $ssh = $this->connect();
        $output = $ssh->exec($command);

        if ($output === false) {
            throw new RuntimeException("Gagal menjalankan perintah CHR: {$command}");
        }

        return trim((string) $output);
    }

    public function identity(): array
    {
        $raw = $this->run('/system identity print');
        preg_match('/name:\s*(.+)/', $raw, $m);

        return [
            'name' => trim($m[1] ?? 'Unknown'),
            'raw' => $raw,
        ];
    }

    public function resource(): array
    {
        $raw = $this->run('/system resource print');
        $data = ['raw' => $raw];
        foreach (['version', 'uptime', 'cpu-load', 'free-memory', 'total-memory', 'board-name'] as $key) {
            if (preg_match('/'.preg_quote($key, '/').':\s*(.+)/', $raw, $m)) {
                $data[str_replace('-', '_', $key)] = trim($m[1]);
            }
        }

        return $data;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function pppSecrets(): array
    {
        $raw = $this->run('/ppp secret print detail without-paging');
        $blocks = preg_split('/\n\s*\n/', $raw) ?: [];
        $items = [];

        foreach ($blocks as $block) {
            if (! str_contains($block, 'name=')) {
                continue;
            }

            $item = [
                'disabled' => str_contains($block, 'Flags:') && preg_match('/Flags:.*X/', $block) === 1,
            ];

            foreach (['name', 'service', 'profile', 'local-address', 'remote-address', 'password', 'caller-id', 'last-caller-id', 'last-disconnect-reason'] as $field) {
                if (preg_match('/\b'.preg_quote($field, '/').'="?([^"\s]+)"?/', $block, $m)
                    || preg_match('/\b'.preg_quote($field, '/').'=([^\s]+)/', $block, $m)) {
                    $item[str_replace('-', '_', $field)] = trim($m[1], '"');
                }
            }

            if (isset($item['name'])) {
                $items[] = $item;
            }
        }

        // Fallback terse parser if detail format differs
        if ($items === []) {
            $terse = $this->run('/ppp secret export terse');
            foreach (explode("\n", $terse) as $line) {
                if (! str_contains($line, '/ppp secret add')) {
                    continue;
                }
                $item = [
                    'disabled' => str_contains($line, 'disabled=yes'),
                    'name' => $this->attr($line, 'name'),
                    'service' => $this->attr($line, 'service') ?? 'l2tp',
                    'profile' => $this->attr($line, 'profile'),
                    'local_address' => $this->attr($line, 'local-address'),
                    'remote_address' => $this->attr($line, 'remote-address'),
                    'password' => $this->attr($line, 'password'),
                ];
                if ($item['name']) {
                    $items[] = $item;
                }
            }
        }

        return $items;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function pppActive(): array
    {
        $terse = $this->run('/ppp active print detail without-paging');
        $blocks = preg_split('/\n\s*\n/', $terse) ?: [];
        $items = [];

        foreach ($blocks as $block) {
            if (! str_contains($block, 'name=')) {
                continue;
            }
            $item = [];
            foreach (['name', 'service', 'caller-id', 'address', 'uptime', 'encoding'] as $field) {
                if (preg_match('/\b'.preg_quote($field, '/').'="([^"]+)"/', $block, $m)
                    || preg_match('/\b'.preg_quote($field, '/').'=([^\s]+)/', $block, $m)) {
                    $item[str_replace('-', '_', $field)] = trim($m[1], '"');
                }
            }
            if (isset($item['name'])) {
                $items[] = $item;
            }
        }

        return $items;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function natRules(): array
    {
        $terse = $this->run('/ip firewall nat export terse');
        $items = [];

        foreach (explode("\n", $terse) as $line) {
            if (! str_contains($line, 'action=dst-nat')) {
                continue;
            }

            $dstPort = $this->attr($line, 'dst-port');
            $toPorts = $this->attr($line, 'to-ports');
            [$pubStart, $pubEnd] = $this->parsePortRange($dstPort);
            [$locStart, $locEnd] = $this->parsePortRange($toPorts);

            $items[] = [
                'disabled' => str_contains($line, 'disabled=yes'),
                'comment' => $this->attr($line, 'comment') ?? '',
                'protocol' => $this->attr($line, 'protocol') ?? 'tcp',
                'dst_address' => $this->attr($line, 'dst-address'),
                'to_addresses' => $this->attr($line, 'to-addresses'),
                'public_port' => $pubStart,
                'public_port_end' => $pubEnd,
                'local_port' => $locStart,
                'local_port_end' => $locEnd,
            ];
        }

        return $items;
    }

    public function ensurePppSecret(array $data): void
    {
        $name = $data['name'];
        $this->run(':do { /ppp secret remove [find name="'.$this->esc($name).'"] } on-error={}');

        $cmd = sprintf(
            '/ppp secret add name="%s" password="%s" service=%s profile="%s" local-address=%s remote-address=%s',
            $this->esc($name),
            $this->esc($data['password']),
            $data['service'] ?? 'l2tp',
            $this->esc($data['profile'] ?? config('chr.default_profile')),
            $data['local_address'] ?? config('chr.tunnel_gateway'),
            $data['remote_address']
        );

        if (! empty($data['disabled'])) {
            $cmd .= ' disabled=yes';
        }

        $this->run($cmd);
    }

    public function setPppSecretDisabled(string $name, bool $disabled): void
    {
        $value = $disabled ? 'yes' : 'no';
        $this->run('/ppp secret set [find name="'.$this->esc($name).'"] disabled='.$value);
    }

    public function disconnectPppActive(string $name): void
    {
        $this->run(':do { /ppp active remove [find name="'.$this->esc($name).'"] } on-error={}');
    }

    public function removePppSecret(string $name): void
    {
        $this->run(':do { /ppp active remove [find name="'.$this->esc($name).'"] } on-error={}');
        $this->run(':do { /ppp secret remove [find name="'.$this->esc($name).'"] } on-error={}');
    }

    public function removeNatByComment(string $comment): void
    {
        $this->run(':do { /ip firewall nat remove [find comment="'.$this->esc($comment).'"] } on-error={}');
    }

    public function removeNatByToAddresses(string $toAddress): void
    {
        $this->run(':do { /ip firewall nat remove [find to-addresses="'.$this->esc($toAddress).'"] } on-error={}');
    }

    public function addDstNat(array $rule): void
    {
        $comment = $rule['comment'];
        $this->removeNatByComment($comment);

        $dstPort = isset($rule['public_port_end']) && $rule['public_port_end'] !== $rule['public_port']
            ? $rule['public_port'].'-'.$rule['public_port_end']
            : (string) $rule['public_port'];

        $toPorts = isset($rule['local_port_end']) && $rule['local_port_end'] !== $rule['local_port']
            ? $rule['local_port'].'-'.$rule['local_port_end']
            : (string) $rule['local_port'];

        $cmd = sprintf(
            '/ip firewall nat add chain=dstnat action=dst-nat protocol=%s dst-address=%s dst-port=%s to-addresses=%s to-ports=%s comment="%s"',
            $rule['protocol'] ?? 'tcp',
            $rule['dst_address'] ?? config('chr.public_ip'),
            $dstPort,
            $rule['to_addresses'],
            $toPorts,
            $this->esc($comment)
        );

        if (! empty($rule['disabled'])) {
            $cmd .= ' disabled=yes';
        }

        $this->run($cmd);
    }

    public function disconnect(): void
    {
        if ($this->ssh) {
            $this->ssh->disconnect();
            $this->ssh = null;
        }
    }

    protected function attr(string $line, string $key): ?string
    {
        if (preg_match('/\b'.preg_quote($key, '/').'="([^"]*)"/', $line, $m)) {
            return $m[1];
        }
        if (preg_match('/\b'.preg_quote($key, '/').'=([^\s]+)/', $line, $m)) {
            return $m[1];
        }

        return null;
    }

    /**
     * @return array{0: ?int, 1: ?int}
     */
    protected function parsePortRange(?string $value): array
    {
        if ($value === null || $value === '') {
            return [null, null];
        }
        if (str_contains($value, '-')) {
            [$a, $b] = explode('-', $value, 2);

            return [(int) $a, (int) $b];
        }

        return [(int) $value, (int) $value];
    }

    protected function esc(string $value): string
    {
        return str_replace(['\\', '"'], ['\\\\', '\\"'], $value);
    }
}
