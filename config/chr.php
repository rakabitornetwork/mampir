<?php

return [
    'host' => env('CHR_HOST', '31.57.178.91'),
    'port' => (int) env('CHR_PORT', 22),
    'username' => env('CHR_USERNAME', 'ai'),
    'password' => env('CHR_PASSWORD', ''),
    'public_ip' => env('CHR_PUBLIC_IP', '31.57.178.91'),
    'tunnel_gateway' => env('CHR_TUNNEL_GATEWAY', '192.168.172.254'),
    'tunnel_network' => env('CHR_TUNNEL_NETWORK', '192.168.172'),
    'tunnel_start_host' => (int) env('CHR_TUNNEL_START_HOST', 2),
    'tunnel_end_host' => (int) env('CHR_TUNNEL_END_HOST', 250),
    'default_profile' => env('CHR_DEFAULT_PROFILE', 'default-encryption'),
    'port_block_start' => (int) env('CHR_PORT_BLOCK_START', 1100),
    'port_block_end' => (int) env('CHR_PORT_BLOCK_END', 8900),
    'port_block_step' => (int) env('CHR_PORT_BLOCK_STEP', 300),

    /*
    |--------------------------------------------------------------------------
    | Standard port forward templates (offsets from port block base)
    | Pattern observed on CHR Teslatech | Perwiracloud
    |--------------------------------------------------------------------------
    */
    'service_templates' => [
        'ssh' => [
            'label' => 'SSH',
            'local_port' => 22,
            'offset' => 22,
            'icon' => 'terminal',
        ],
        'http' => [
            'label' => 'HTTP',
            'local_port' => 80,
            'offset' => 80,
            'icon' => 'globe',
        ],
        'olt' => [
            'label' => 'OLT',
            'local_port' => 8070,
            'offset' => 187,
            'icon' => 'router',
        ],
        'api' => [
            'label' => 'API RouterOS',
            'local_port' => 8728,
            'offset' => 228,
            'icon' => 'code',
        ],
        'winbox' => [
            'label' => 'Winbox',
            'local_port' => 8291,
            'offset' => 291,
            'icon' => 'monitor',
        ],
    ],
];
