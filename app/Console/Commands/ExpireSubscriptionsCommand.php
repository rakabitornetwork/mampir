<?php

namespace App\Console\Commands;

use App\Services\SubscriptionService;
use Illuminate\Console\Command;

class ExpireSubscriptionsCommand extends Command
{
    protected $signature = 'chr:expire {--dry-run : Hanya tampilkan tanpa disable di CHR}';

    protected $description = 'Nonaktifkan pelanggan yang masa aktifnya sudah habis';

    public function handle(SubscriptionService $subscriptions): int
    {
        $result = $subscriptions->processExpirations(! $this->option('dry-run'));
        $this->info("Expired: {$result['expired']} | Disabled on CHR: {$result['disabled']}");

        return self::SUCCESS;
    }
}
