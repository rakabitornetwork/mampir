<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tunnel extends Model
{
    protected $fillable = [
        'customer_id',
        'service',
        'profile',
        'local_address',
        'remote_address',
        'port_block',
        'chr_enabled',
        'is_online',
        'caller_id',
        'uptime',
        'last_seen_at',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'chr_enabled' => 'boolean',
            'is_online' => 'boolean',
            'last_seen_at' => 'datetime',
            'meta' => 'array',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function portForwards(): HasMany
    {
        return $this->hasMany(PortForward::class);
    }
}
