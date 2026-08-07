<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Tunnel;
use App\Services\MikroTik\ChrClient;
use App\Services\SubscriptionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerDeleteTest extends TestCase
{
    use RefreshDatabase;

    public function test_purge_expired_customers_removes_old_expired_customers(): void
    {
        // Mock CHR Client to prevent real API connections during tests
        $mockClient = $this->createMock(ChrClient::class);
        $mockClient->expects($this->any())->method('removePppSecret');
        $mockClient->expects($this->any())->method('removeNatByToAddresses');
        $this->app->instance(ChrClient::class, $mockClient);

        // 1. Customer expired 40 days ago (should be purged)
        $oldExpired = Customer::query()->create([
            'name' => 'Old Expired',
            'username' => 'old_user',
            'status' => 'expired',
            'expires_at' => now()->subDays(40),
        ]);
        Tunnel::query()->create([
            'customer_id' => $oldExpired->id,
            'service' => 'l2tp',
            'remote_address' => '10.10.10.1',
        ]);

        // 2. Customer expired 10 days ago (should NOT be purged with 30-day threshold)
        $recentExpired = Customer::query()->create([
            'name' => 'Recent Expired',
            'username' => 'recent_user',
            'status' => 'expired',
            'expires_at' => now()->subDays(10),
        ]);

        // 3. Active customer (should NOT be purged)
        $activeCustomer = Customer::query()->create([
            'name' => 'Active Customer',
            'username' => 'active_user',
            'status' => 'active',
            'expires_at' => now()->addDays(30),
        ]);

        /** @var SubscriptionService $service */
        $service = $this->app->make(SubscriptionService::class);
        $result = $service->purgeExpiredCustomers(daysThreshold: 30, pushToChr: true);

        $this->assertEquals(1, $result['purged']);
        $this->assertDatabaseMissing('customers', ['id' => $oldExpired->id]);
        $this->assertDatabaseHas('customers', ['id' => $recentExpired->id]);
        $this->assertDatabaseHas('customers', ['id' => $activeCustomer->id]);
    }

    public function test_cleanup_expired_artisan_command(): void
    {
        $mockClient = $this->createMock(ChrClient::class);
        $this->app->instance(ChrClient::class, $mockClient);

        Customer::query()->create([
            'name' => 'Expired User',
            'username' => 'exp_user',
            'status' => 'expired',
            'expires_at' => now()->subDays(35),
        ]);

        $this->artisan('chr:cleanup-expired --days=30')
            ->expectsOutputToContain('Purged: 1 pelanggan')
            ->assertExitCode(0);

        $this->assertDatabaseMissing('customers', ['username' => 'exp_user']);
    }
}
