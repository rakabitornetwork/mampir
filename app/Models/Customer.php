<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Customer extends Model
{
    protected $fillable = [
        'name',
        'username',
        'password',
        'email',
        'phone',
        'company',
        'notes',
        'status',
        'synced_from_chr',
        'starts_at',
        'expires_at',
        'duration_days',
        'last_synced_at',
    ];

    protected function casts(): array
    {
        return [
            'synced_from_chr' => 'boolean',
            'starts_at' => 'datetime',
            'expires_at' => 'datetime',
            'last_synced_at' => 'datetime',
        ];
    }

    public function tunnel(): HasOne
    {
        return $this->hasOne(Tunnel::class);
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class)->latest();
    }

    public function activeSubscription(): HasOne
    {
        return $this->hasOne(Subscription::class)->where('status', 'active')->latestOfMany();
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    public function daysRemaining(): ?int
    {
        if ($this->expires_at === null) {
            return null;
        }

        if ($this->expires_at->isPast()) {
            return 0;
        }

        return (int) now()->diffInDays($this->expires_at);
    }

    public function refreshStatusFromExpiry(): void
    {
        if ($this->status === 'suspended' || $this->status === 'draft') {
            return;
        }

        $this->status = $this->isExpired() ? 'expired' : 'active';
        $this->save();
    }
}
