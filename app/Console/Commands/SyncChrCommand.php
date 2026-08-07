<?php

namespace App\Console\Commands;

use App\Services\MikroTik\ChrSyncService;
use Illuminate\Console\Command;

class SyncChrCommand extends Command
{
    protected $signature = 'chr:sync';

    protected $description = 'Pull pelanggan, tunnel, dan port forward dari CHR MikroTik';

    public function handle(ChrSyncService $sync): int
    {
        $this->info('Menyinkronkan data dari CHR...');

        try {
            $result = $sync->safePull();
        } catch (\Throwable $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        $this->info("OK — {$result['customers']} pelanggan, {$result['ports']} port, {$result['online']} online ({$result['identity']})");

        return self::SUCCESS;
    }
}
