<?php

namespace App\Services\MikroTik;

use RuntimeException;

class ChrClient
{
    protected ?RouterOsApi $api = null;

    public function connect(): RouterOsApi
    {
        if ($this->api?->isConnected()) {
            return $this->api;
        }

        $host = (string) config('chr.host');
        $port = (int) config('chr.port', 8728);
        $username = (string) config('chr.username');
        $password = (string) config('chr.password');
        $ssl = (bool) config('chr.ssl', false);

        if ($host === '' || $username === '') {
            throw new RuntimeException('Host/username CHR belum dikonfigurasi di panel Pengaturan.');
        }

        if ($password === '') {
            throw new RuntimeException('Password CHR belum dikonfigurasi di panel Pengaturan.');
        }

        $api = new RouterOsApi;
        $api->connect($host, $port, $username, $password, (int) config('chr.timeout', 15), $ssl);
        $this->api = $api;

        return $api;
    }

    public function identity(): array
    {
        $rows = $this->connect()->print('/system/identity');
        $row = $rows[0] ?? [];

        return [
            'name' => (string) ($row['name'] ?? 'Unknown'),
            'raw' => $row,
        ];
    }

    public function resource(): array
    {
        $rows = $this->connect()->print('/system/resource');
        $row = $rows[0] ?? [];

        return [
            'version' => $row['version'] ?? null,
            'uptime' => $row['uptime'] ?? null,
            'cpu_load' => $row['cpu-load'] ?? null,
            'free_memory' => $row['free-memory'] ?? null,
            'total_memory' => $row['total-memory'] ?? null,
            'board_name' => $row['board-name'] ?? null,
            'raw' => $row,
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function pppSecrets(): array
    {
        $rows = $this->connect()->print('/ppp/secret');
        $items = [];

        foreach ($rows as $row) {
            $name = $row['name'] ?? null;
            if (! $name) {
                continue;
            }

            $items[] = [
                'id' => $row['.id'] ?? null,
                'disabled' => $this->isYes($row['disabled'] ?? null),
                'name' => (string) $name,
                'service' => (string) ($row['service'] ?? 'l2tp'),
                'profile' => $row['profile'] ?? null,
                'local_address' => $row['local-address'] ?? null,
                'remote_address' => $row['remote-address'] ?? null,
                'password' => $row['password'] ?? null,
                'caller_id' => $row['caller-id'] ?? null,
                'last_caller_id' => $row['last-caller-id'] ?? null,
                'last_disconnect_reason' => $row['last-disconnect-reason'] ?? null,
            ];
        }

        return $items;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function pppActive(): array
    {
        $rows = $this->connect()->print('/ppp/active');
        $items = [];

        foreach ($rows as $row) {
            $name = $row['name'] ?? null;
            if (! $name) {
                continue;
            }

            $items[] = [
                'id' => $row['.id'] ?? null,
                'name' => (string) $name,
                'service' => $row['service'] ?? null,
                'caller_id' => $row['caller-id'] ?? null,
                'address' => $row['address'] ?? null,
                'uptime' => $row['uptime'] ?? null,
                'encoding' => $row['encoding'] ?? null,
            ];
        }

        return $items;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function natRules(): array
    {
        $rows = $this->connect()->print('/ip/firewall/nat');
        $items = [];

        foreach ($rows as $row) {
            if (($row['action'] ?? '') !== 'dst-nat') {
                continue;
            }

            [$pubStart, $pubEnd] = $this->parsePortRange($row['dst-port'] ?? null);
            [$locStart, $locEnd] = $this->parsePortRange($row['to-ports'] ?? null);

            $items[] = [
                'id' => $row['.id'] ?? null,
                'disabled' => $this->isYes($row['disabled'] ?? null),
                'comment' => (string) ($row['comment'] ?? ''),
                'protocol' => (string) ($row['protocol'] ?? 'tcp'),
                'dst_address' => $row['dst-address'] ?? null,
                'to_addresses' => $row['to-addresses'] ?? null,
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
        $api = $this->connect();
        $name = (string) $data['name'];

        foreach ($this->findIds('/ppp/secret', 'name', $name) as $id) {
            $this->assertOk($api->command('/ppp/secret/remove', ['.id' => $id]));
        }

        $attrs = [
            'name' => $name,
            'password' => (string) $data['password'],
            'service' => (string) ($data['service'] ?? 'l2tp'),
            'profile' => (string) ($data['profile'] ?? config('chr.default_profile')),
            'local-address' => (string) ($data['local_address'] ?? config('chr.tunnel_gateway')),
            'remote-address' => (string) $data['remote_address'],
            'disabled' => ! empty($data['disabled']) ? 'yes' : 'no',
        ];

        $this->assertOk($api->command('/ppp/secret/add', $attrs));
    }

    public function setPppSecretDisabled(string $name, bool $disabled): void
    {
        $api = $this->connect();
        $ids = $this->findIds('/ppp/secret', 'name', $name);
        if ($ids === []) {
            return;
        }

        foreach ($ids as $id) {
            $this->assertOk($api->command('/ppp/secret/set', [
                '.id' => $id,
                'disabled' => $disabled ? 'yes' : 'no',
            ]));
        }
    }

    public function disconnectPppActive(string $name): void
    {
        $api = $this->connect();
        foreach ($this->findIds('/ppp/active', 'name', $name) as $id) {
            $this->assertOk($api->command('/ppp/active/remove', ['.id' => $id]));
        }
    }

    public function removePppSecret(string $name): void
    {
        $this->disconnectPppActive($name);

        $api = $this->connect();
        foreach ($this->findIds('/ppp/secret', 'name', $name) as $id) {
            $this->assertOk($api->command('/ppp/secret/remove', ['.id' => $id]));
        }
    }

    public function removeNatByComment(string $comment): void
    {
        $api = $this->connect();
        foreach ($this->findIds('/ip/firewall/nat', 'comment', $comment) as $id) {
            $this->assertOk($api->command('/ip/firewall/nat/remove', ['.id' => $id]));
        }
    }

    public function removeNatByToAddresses(string $toAddress): void
    {
        $api = $this->connect();
        foreach ($this->findIds('/ip/firewall/nat', 'to-addresses', $toAddress) as $id) {
            $this->assertOk($api->command('/ip/firewall/nat/remove', ['.id' => $id]));
        }
    }

    public function addDstNat(array $rule): void
    {
        $comment = (string) $rule['comment'];
        $this->removeNatByComment($comment);

        $dstPort = isset($rule['public_port_end']) && $rule['public_port_end'] !== $rule['public_port']
            ? $rule['public_port'].'-'.$rule['public_port_end']
            : (string) $rule['public_port'];

        $toPorts = isset($rule['local_port_end']) && $rule['local_port_end'] !== $rule['local_port']
            ? $rule['local_port'].'-'.$rule['local_port_end']
            : (string) $rule['local_port'];

        $attrs = [
            'chain' => 'dstnat',
            'action' => 'dst-nat',
            'protocol' => (string) ($rule['protocol'] ?? 'tcp'),
            'dst-address' => (string) ($rule['dst_address'] ?? config('chr.public_ip')),
            'dst-port' => $dstPort,
            'to-addresses' => (string) $rule['to_addresses'],
            'to-ports' => $toPorts,
            'comment' => $comment,
            'disabled' => ! empty($rule['disabled']) ? 'yes' : 'no',
        ];

        $this->assertOk($this->connect()->command('/ip/firewall/nat/add', $attrs));
    }

    public function disconnect(): void
    {
        $this->api?->disconnect();
        $this->api = null;
    }

    /**
     * @return list<string>
     */
    protected function findIds(string $path, string $field, string $value): array
    {
        $rows = $this->connect()->print($path, ['?'.$field.'='.$value]);
        $ids = [];

        foreach ($rows as $row) {
            if (! empty($row['.id'])) {
                $ids[] = (string) $row['.id'];
            }
        }

        // Fallback tanpa query filter (beberapa ROS lebih rewel)
        if ($ids === []) {
            foreach ($this->connect()->print($path) as $row) {
                if (($row[$field] ?? null) === $value && ! empty($row['.id'])) {
                    $ids[] = (string) $row['.id'];
                }
            }
        }

        return $ids;
    }

    /**
     * @param  list<array<string, mixed>>  $reply
     */
    protected function assertOk(array $reply): void
    {
        $api = $this->api;
        if ($api && $api->hasTrap($reply)) {
            throw new RuntimeException('Perintah API CHR gagal: '.$api->trapMessage($reply));
        }
    }

    protected function isYes(mixed $value): bool
    {
        return in_array(strtolower((string) $value), ['yes', 'true', '1'], true);
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
}
