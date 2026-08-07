<?php

namespace App\Services;

use App\Models\AppSetting;
use Illuminate\Support\Facades\Schema;
use Throwable;

class ChrSettingsService
{
    public const STORAGE_KEY = 'chr';

    /**
     * Default dari config/chr.php (tanpa overlay database).
     *
     * @return array<string, mixed>
     */
    public function fileDefaults(): array
    {
        return require config_path('chr.php');
    }

    /**
     * @return array<string, mixed>
     */
    public function all(): array
    {
        $defaults = $this->fileDefaults();
        $stored = $this->stored();

        if ($stored === []) {
            return $defaults;
        }

        $merged = array_replace($defaults, $stored);

        if (isset($stored['service_templates']) && is_array($stored['service_templates'])) {
            $merged['service_templates'] = $stored['service_templates'];
        } else {
            $merged['service_templates'] = $defaults['service_templates'] ?? [];
        }

        $merged['port'] = (int) ($merged['port'] ?? 22);
        $merged['tunnel_start_host'] = (int) ($merged['tunnel_start_host'] ?? 2);
        $merged['tunnel_end_host'] = (int) ($merged['tunnel_end_host'] ?? 250);
        $merged['port_block_start'] = (int) ($merged['port_block_start'] ?? 1100);
        $merged['port_block_end'] = (int) ($merged['port_block_end'] ?? 8900);
        $merged['port_block_step'] = (int) ($merged['port_block_step'] ?? 300);

        return $merged;
    }

    /**
     * Data untuk panel: password tidak dikirim balik (isi ulang hanya jika ingin mengubah).
     *
     * @return array<string, mixed>
     */
    public function forPanel(): array
    {
        $chr = $this->all();

        return [
            'host' => (string) ($chr['host'] ?? ''),
            'port' => (int) ($chr['port'] ?? 22),
            'username' => (string) ($chr['username'] ?? ''),
            'password' => '',
            'has_password' => filled($chr['password'] ?? null),
            'public_ip' => (string) ($chr['public_ip'] ?? ''),
            'tunnel_gateway' => (string) ($chr['tunnel_gateway'] ?? ''),
            'tunnel_network' => (string) ($chr['tunnel_network'] ?? ''),
            'tunnel_start_host' => (int) ($chr['tunnel_start_host'] ?? 2),
            'tunnel_end_host' => (int) ($chr['tunnel_end_host'] ?? 250),
            'default_profile' => (string) ($chr['default_profile'] ?? 'default-encryption'),
            'port_block_start' => (int) ($chr['port_block_start'] ?? 1100),
            'port_block_end' => (int) ($chr['port_block_end'] ?? 8900),
            'port_block_step' => (int) ($chr['port_block_step'] ?? 300),
            'service_templates' => $chr['service_templates'] ?? [],
            'source' => $this->stored() === [] ? 'default' : 'database',
        ];
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function update(array $input): array
    {
        $current = $this->all();

        $templates = $current['service_templates'] ?? [];
        if (isset($input['service_templates']) && is_array($input['service_templates'])) {
            $templates = $this->normalizeTemplates($input['service_templates']);
        }

        $password = (string) ($current['password'] ?? '');
        if (array_key_exists('password', $input) && is_string($input['password']) && $input['password'] !== '') {
            $password = $input['password'];
        }

        $payload = [
            'host' => trim((string) ($input['host'] ?? $current['host'] ?? '')),
            'port' => (int) ($input['port'] ?? $current['port'] ?? 22),
            'username' => trim((string) ($input['username'] ?? $current['username'] ?? '')),
            'password' => $password,
            'public_ip' => trim((string) ($input['public_ip'] ?? $current['public_ip'] ?? '')),
            'tunnel_gateway' => trim((string) ($input['tunnel_gateway'] ?? $current['tunnel_gateway'] ?? '')),
            'tunnel_network' => rtrim(trim((string) ($input['tunnel_network'] ?? $current['tunnel_network'] ?? '')), '.'),
            'tunnel_start_host' => (int) ($input['tunnel_start_host'] ?? $current['tunnel_start_host'] ?? 2),
            'tunnel_end_host' => (int) ($input['tunnel_end_host'] ?? $current['tunnel_end_host'] ?? 250),
            'default_profile' => trim((string) ($input['default_profile'] ?? $current['default_profile'] ?? 'default-encryption')),
            'port_block_start' => (int) ($input['port_block_start'] ?? $current['port_block_start'] ?? 1100),
            'port_block_end' => (int) ($input['port_block_end'] ?? $current['port_block_end'] ?? 8900),
            'port_block_step' => (int) ($input['port_block_step'] ?? $current['port_block_step'] ?? 300),
            'service_templates' => $templates,
        ];

        AppSetting::setValue(self::STORAGE_KEY, json_encode($payload, JSON_UNESCAPED_UNICODE));
        $this->applyToConfig();

        return $this->forPanel();
    }

    public function applyToConfig(): void
    {
        config(['chr' => $this->all()]);
    }

    /**
     * Seed nilai awal dari config/env ke database jika belum ada.
     */
    public function seedFromConfigIfEmpty(): void
    {
        if ($this->stored() !== []) {
            return;
        }

        $defaults = $this->fileDefaults();
        AppSetting::setValue(self::STORAGE_KEY, json_encode([
            'host' => $defaults['host'] ?? '',
            'port' => (int) ($defaults['port'] ?? 22),
            'username' => $defaults['username'] ?? '',
            'password' => $defaults['password'] ?? '',
            'public_ip' => $defaults['public_ip'] ?? '',
            'tunnel_gateway' => $defaults['tunnel_gateway'] ?? '',
            'tunnel_network' => $defaults['tunnel_network'] ?? '',
            'tunnel_start_host' => (int) ($defaults['tunnel_start_host'] ?? 2),
            'tunnel_end_host' => (int) ($defaults['tunnel_end_host'] ?? 250),
            'default_profile' => $defaults['default_profile'] ?? 'default-encryption',
            'port_block_start' => (int) ($defaults['port_block_start'] ?? 1100),
            'port_block_end' => (int) ($defaults['port_block_end'] ?? 8900),
            'port_block_step' => (int) ($defaults['port_block_step'] ?? 300),
            'service_templates' => $defaults['service_templates'] ?? [],
        ], JSON_UNESCAPED_UNICODE));
    }

    public function canUseDatabase(): bool
    {
        try {
            return Schema::hasTable('app_settings');
        } catch (Throwable) {
            return false;
        }
    }

    /**
     * @return array<string, mixed>
     */
    protected function stored(): array
    {
        if (! $this->canUseDatabase()) {
            return [];
        }

        try {
            $raw = AppSetting::getValue(self::STORAGE_KEY);
        } catch (Throwable) {
            return [];
        }

        if (! is_string($raw) || $raw === '') {
            return [];
        }

        $decoded = json_decode($raw, true);

        return is_array($decoded) ? $decoded : [];
    }

    /**
     * @param  array<string, mixed>  $templates
     * @return array<string, array{label:string, local_port:int, offset:int, icon:string}>
     */
    protected function normalizeTemplates(array $templates): array
    {
        $normalized = [];

        foreach ($templates as $key => $tpl) {
            if (! is_array($tpl)) {
                continue;
            }

            $slug = is_string($key) ? trim($key) : '';
            if ($slug === '') {
                continue;
            }

            $normalized[$slug] = [
                'label' => (string) ($tpl['label'] ?? strtoupper($slug)),
                'local_port' => (int) ($tpl['local_port'] ?? 0),
                'offset' => (int) ($tpl['offset'] ?? 0),
                'icon' => (string) ($tpl['icon'] ?? 'globe'),
            ];
        }

        return $normalized;
    }
}
