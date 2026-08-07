<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Tunnel;
use App\Models\User;
use App\Services\MikroTik\ChrClient;
use App\Services\SubscriptionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubscriptionExpiryTest extends TestCase
{
    use RefreshDatabase;

    public function test_expired_subscription_disables_secret_and_disconnects_active_ppp_session(): void
    {
        $mockClient = $this->createMock(ChrClient::class);

        // Expect secret disabled to true AND active session disconnected
        $mockClient->expects($this->once())
            ->method('setPppSecretDisabled')
            ->with('exp_user', true);

        $mockClient->expects($this->once())
            ->method('disconnectPppActive')
            ->with('exp_user');

        $this->app->instance(ChrClient::class, $mockClient);

        $customer = Customer::query()->create([
            'name' => 'Expired User',
            'username' => 'exp_user',
            'status' => 'active',
            'expires_at' => now()->subMinute(),
        ]);
        Tunnel::query()->create([
            'customer_id' => $customer->id,
            'service' => 'l2tp',
            'remote_address' => '192.168.172.50',
            'chr_enabled' => true,
        ]);

        /** @var SubscriptionService $service */
        $service = $this->app->make(SubscriptionService::class);
        $result = $service->processExpirations(pushToChr: true);

        $this->assertEquals(1, $result['expired']);
        $this->assertEquals(1, $result['disabled']);
        $this->assertDatabaseHas('customers', [
            'id' => $customer->id,
            'status' => 'expired',
        ]);
    }

    public function test_renewing_subscription_re_enables_secret_on_chr(): void
    {
        $user = User::query()->create([
            'name' => 'Admin',
            'email' => 'admin@example.com',
            'password' => bcrypt('password'),
        ]);
        $this->actingAs($user);

        $mockClient = $this->createMock(ChrClient::class);
        $mockClient->expects($this->once())
            ->method('setPppSecretDisabled')
            ->with('renew_user', false);

        $this->app->instance(ChrClient::class, $mockClient);

        $customer = Customer::query()->create([
            'name' => 'Renew User',
            'username' => 'renew_user',
            'status' => 'expired',
            'expires_at' => now()->subDay(),
        ]);
        Tunnel::query()->create([
            'customer_id' => $customer->id,
            'service' => 'l2tp',
            'remote_address' => '192.168.172.51',
            'chr_enabled' => false,
        ]);

        $response = $this->post("/customers/{$customer->id}/renew", [
            'duration_days' => 30,
            'push_to_chr' => true,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('customers', [
            'id' => $customer->id,
            'status' => 'active',
        ]);
    }
}
