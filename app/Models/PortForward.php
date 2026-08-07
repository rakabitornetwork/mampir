<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PortForward extends Model
{
    protected $fillable = [
        'tunnel_id',
        'label',
        'service_key',
        'public_port',
        'public_port_end',
        'local_port',
        'local_port_end',
        'protocol',
        'comment',
        'enabled',
        'synced_from_chr',
    ];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'synced_from_chr' => 'boolean',
        ];
    }

    public function tunnel(): BelongsTo
    {
        return $this->belongsTo(Tunnel::class);
    }

    public function publicPortLabel(): string
    {
        if ($this->public_port_end && $this->public_port_end !== $this->public_port) {
            return "{$this->public_port}-{$this->public_port_end}";
        }

        return (string) $this->public_port;
    }

    public function localPortLabel(): string
    {
        if ($this->local_port_end && $this->local_port_end !== $this->local_port) {
            return "{$this->local_port}-{$this->local_port_end}";
        }

        return (string) $this->local_port;
    }
}
