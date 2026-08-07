<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Services\MikroTik\ChrSyncService;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

class SubscriptionService
{
    public function __construct(protected ChrSyncService $chrSync) {}

    public function assign(
        Customer $customer,
        int $durationDays,
        ?SubscriptionPlan $plan = null,
        ?CarbonInterface $startsAt = null,
        ?float $amount = null,
        ?string $notes = null,
        bool $pushToChr = true,
    ): Subscription {
        return DB::transaction(function () use ($customer, $durationDays, $plan, $startsAt, $amount, $notes, $pushToChr) {
            $startsAt = $startsAt ? $startsAt->copy() : now();
            $expiresAt = $startsAt->copy()->addDays($durationDays);

            Subscription::query()
                ->where('customer_id', $customer->id)
                ->where('status', 'active')
                ->update(['status' => 'cancelled']);

            $subscription = Subscription::query()->create([
                'customer_id' => $customer->id,
                'subscription_plan_id' => $plan?->id,
                'duration_days' => $durationDays,
                'starts_at' => $startsAt,
                'expires_at' => $expiresAt,
                'status' => 'active',
                'amount' => $amount ?? $plan?->price,
                'notes' => $notes,
            ]);

            $customer->update([
                'starts_at' => $startsAt,
                'expires_at' => $expiresAt,
                'duration_days' => $durationDays,
                'status' => 'active',
            ]);

            if ($customer->tunnel) {
                $customer->tunnel->update(['chr_enabled' => true]);
            }

            if ($pushToChr && $customer->tunnel) {
                try {
                    $this->chrSync->applyExpiryOnChr($customer->fresh(['tunnel']));
                } catch (\Throwable) {
                    // Allow local assignment even if CHR temporarily unreachable
                }
            }

            return $subscription;
        });
    }

    public function extend(Customer $customer, int $extraDays, bool $pushToChr = true): Subscription
    {
        $base = $customer->expires_at && $customer->expires_at->isFuture()
            ? $customer->expires_at->copy()
            : now();

        $newExpiry = $base->addDays($extraDays);
        $totalDays = $customer->starts_at
            ? (int) $customer->starts_at->diffInDays($newExpiry)
            : $extraDays;

        return $this->assign(
            customer: $customer,
            durationDays: max($totalDays, $extraDays),
            startsAt: $customer->starts_at ?? now(),
            notes: "Perpanjangan +{$extraDays} hari",
            pushToChr: $pushToChr,
        );
    }

    /**
     * @return array{expired:int, disabled:int}
     */
    public function processExpirations(bool $pushToChr = true): array
    {
        $expired = 0;
        $disabled = 0;

        $customers = Customer::query()
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', now())
            ->whereIn('status', ['active'])
            ->with('tunnel')
            ->get();

        foreach ($customers as $customer) {
            $customer->update(['status' => 'expired']);
            Subscription::query()
                ->where('customer_id', $customer->id)
                ->where('status', 'active')
                ->where('expires_at', '<=', now())
                ->update(['status' => 'expired']);

            $expired++;

            if ($pushToChr && $customer->tunnel) {
                try {
                    $this->chrSync->applyExpiryOnChr($customer);
                    $disabled++;
                } catch (\Throwable) {
                    // logged via sync later
                }
            }
        }

        return compact('expired', 'disabled');
    }

    /**
     * @return array{purged:int, chr_cleaned:int}
     */
    public function purgeExpiredCustomers(int $daysThreshold = 30, bool $pushToChr = true): array
    {
        $purged = 0;
        $chrCleaned = 0;

        $cutoffDate = now()->subDays($daysThreshold);

        $customers = Customer::query()
            ->where('status', 'expired')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', $cutoffDate)
            ->with('tunnel')
            ->get();

        foreach ($customers as $customer) {
            if ($pushToChr) {
                try {
                    $this->chrSync->removeCustomerFromChr($customer);
                    $chrCleaned++;
                } catch (\Throwable) {
                    // Izinkan penghapusan lokal meskipun CHR gagal dijangkau
                }
            }

            $customer->delete();
            $purged++;
        }

        return ['purged' => $purged, 'chr_cleaned' => $chrCleaned];
    }
}
