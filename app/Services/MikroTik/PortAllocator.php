<?php

namespace App\Services\MikroTik;

use App\Models\PortForward;
use App\Models\Tunnel;
use RuntimeException;

class PortAllocator
{
    /**
     * @return list<int>
     */
    public function usedBlocks(): array
    {
        return Tunnel::query()
            ->whereNotNull('port_block')
            ->pluck('port_block')
            ->map(fn ($v) => (int) $v)
            ->unique()
            ->values()
            ->all();
    }

    /**
     * @return list<int>
     */
    public function usedPublicPorts(): array
    {
        $ports = [];
        foreach (PortForward::query()->get(['public_port', 'public_port_end']) as $pf) {
            $end = $pf->public_port_end ?: $pf->public_port;
            for ($p = $pf->public_port; $p <= $end; $p++) {
                $ports[] = $p;
            }
        }

        return array_values(array_unique($ports));
    }

    /**
     * @return list<int>
     */
    public function availableBlocks(): array
    {
        $start = (int) config('chr.port_block_start');
        $end = (int) config('chr.port_block_end');
        $step = (int) config('chr.port_block_step');
        $used = $this->usedBlocks();
        $usedPorts = array_flip($this->usedPublicPorts());
        $available = [];

        for ($block = $start; $block <= $end; $block += $step) {
            if (in_array($block, $used, true)) {
                continue;
            }

            $conflict = false;
            foreach (config('chr.service_templates') as $tpl) {
                $port = $block + (int) $tpl['offset'];
                if (isset($usedPorts[$port])) {
                    $conflict = true;
                    break;
                }
            }
            if (! $conflict) {
                $available[] = $block;
            }
        }

        return $available;
    }

    public function allocateRandomBlock(): int
    {
        $available = $this->availableBlocks();
        if ($available === []) {
            throw new RuntimeException('Tidak ada port block tersedia. Perluas rentang CHR_PORT_BLOCK_*.');
        }

        return $available[array_rand($available)];
    }

    public function nextRemoteAddress(): string
    {
        $network = rtrim((string) config('chr.tunnel_network'), '.');
        $start = (int) config('chr.tunnel_start_host');
        $end = (int) config('chr.tunnel_end_host');

        for ($host = $start; $host <= $end; $host++) {
            $ip = "{$network}.{$host}";
            if ($this->isIpAvailable($ip)) {
                return $ip;
            }
        }

        throw new RuntimeException('Pool remote address tunnel sudah penuh.');
    }

    public function isIpAvailable(string $ip, ?int $ignoreTunnelId = null): bool
    {
        if ($ip === config('chr.tunnel_gateway') || $ip === config('chr.public_ip')) {
            return false;
        }

        return ! Tunnel::query()
            ->when($ignoreTunnelId, fn ($q) => $q->where('id', '!=', $ignoreTunnelId))
            ->where('remote_address', $ip)
            ->exists();
    }

    public function isBlockAvailable(int $block, ?int $ignoreTunnelId = null): bool
    {
        $blockUsed = Tunnel::query()
            ->when($ignoreTunnelId, fn ($q) => $q->where('id', '!=', $ignoreTunnelId))
            ->where('port_block', $block)
            ->exists();

        if ($blockUsed) {
            return false;
        }

        $usedPorts = array_flip($this->usedPublicPorts());
        foreach (config('chr.service_templates') as $tpl) {
            $port = $block + (int) $tpl['offset'];
            if (isset($usedPorts[$port])) {
                return false;
            }
        }

        return true;
    }

    /**
     * @param  list<string>|null  $services
     * @return list<array<string, mixed>>
     */
    public function buildStandardForwards(int $block, string $customerLabel, ?array $services = null): array
    {
        $templates = config('chr.service_templates');
        $keys = $services ?? array_keys($templates);
        $forwards = [];

        foreach ($keys as $key) {
            if (! isset($templates[$key])) {
                continue;
            }
            $tpl = $templates[$key];
            $public = $block + (int) $tpl['offset'];
            $forwards[] = [
                'label' => $tpl['label'],
                'service_key' => $key,
                'public_port' => $public,
                'public_port_end' => $public,
                'local_port' => (int) $tpl['local_port'],
                'local_port_end' => (int) $tpl['local_port'],
                'protocol' => 'tcp',
                'comment' => sprintf('Port %d %s | %s', $tpl['local_port'], $tpl['label'], strtoupper($customerLabel)),
                'enabled' => true,
            ];
        }

        return $forwards;
    }

    public function inferBlockFromPorts(array $publicPorts): ?int
    {
        if ($publicPorts === []) {
            return null;
        }

        $templates = config('chr.service_templates');
        $candidates = [];

        foreach ($publicPorts as $port) {
            foreach ($templates as $tpl) {
                $offset = (int) $tpl['offset'];
                if ($port >= $offset) {
                    $block = $port - $offset;
                    if ($block % 100 === 0 || $block % (int) config('chr.port_block_step') === 0) {
                        $candidates[$block] = ($candidates[$block] ?? 0) + 1;
                    }
                }
            }
        }

        if ($candidates === []) {
            // Fallback: round down to nearest 100
            $min = min($publicPorts);

            return (int) (floor($min / 100) * 100);
        }

        arsort($candidates);

        return (int) array_key_first($candidates);
    }
}
