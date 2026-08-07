<?php

namespace App\Console\Commands;

use App\Services\SubscriptionService;
use Illuminate\Console\Command;

class CleanupExpiredCustomersCommand extends Command
{
    protected $signature = 'chr:cleanup-expired 
                            {--days=30 : Batas jumlah hari setelah expired untuk dihapus} 
                            {--dry-run : Hanya tampilkan simulasi tanpa menghapus dari CHR/Database}';

    protected $description = 'Hapus secara permanen pelanggan yang sudah kadaluwarsa melebihi batas hari yang ditentukan';

    public function handle(SubscriptionService $subscriptions): int
    {
        $days = (int) $this->option('days');
        $dryRun = (bool) $this->option('dry-run');

        if ($dryRun) {
            $cutoff = now()->subDays($days);
            $count = \App\Models\Customer::query()
                ->where('status', 'expired')
                ->whereNotNull('expires_at')
                ->where('expires_at', '<=', $cutoff)
                ->count();

            $this->info("[Dry Run] Terdapat {$count} pelanggan expired lebih dari {$days} hari yang dapat dihapus.");

            return self::SUCCESS;
        }

        $result = $subscriptions->purgeExpiredCustomers(daysThreshold: $days, pushToChr: true);
        $this->info("Purged: {$result['purged']} pelanggan | CHR Cleaned: {$result['chr_cleaned']} pelanggan");

        return self::SUCCESS;
    }
}
