<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Tunnel;
use App\Services\MikroTik\PortAllocator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class IpAllocationTest extends TestCase
{
    use RefreshDatabase;

    public function test_next_remote_address_skips_used_ips_and_gateway(): void
    {
        $allocator = $this->app->make(PortAllocator::class);

        // Gateway is 192.168.172.254, start host is 2 (192.168.172.2)
        $firstIp = $allocator->nextRemoteAddress();
        $this->assertEquals('192.168.172.2', $firstIp);

        // Create customer with 192.168.172.2
        $c1 = Customer::query()->create(['name' => 'Cust 1', 'username' => 'cust1', 'status' => 'active']);
        Tunnel::query()->create([
            'customer_id' => $c1->id,
            'service' => 'l2tp',
            'remote_address' => '192.168.172.2',
        ]);

        // Next IP should be 192.168.172.3
        $secondIp = $allocator->nextRemoteAddress();
        $this->assertEquals('192.168.172.3', $secondIp);
    }

    public function test_validation_fails_for_duplicate_or_gateway_ip(): void
    {
        $user = \App\Models\User::query()->create([
            'name' => 'Admin',
            'email' => 'admin@example.com',
            'password' => bcrypt('password'),
        ]);
        $this->actingAs($user);

        $c1 = Customer::query()->create(['name' => 'Cust 1', 'username' => 'cust1', 'status' => 'active']);
        Tunnel::query()->create([
            'customer_id' => $c1->id,
            'service' => 'l2tp',
            'remote_address' => '192.168.172.10',
            'port_block' => 1200,
        ]);

        // 1. Duplicate IP
        $response = $this->post('/customers', [
            'name' => 'Cust 2',
            'username' => 'cust2',
            'allocate_random_block' => true,
            'remote_address' => '192.168.172.10',
        ]);
        $response->assertSessionHasErrors('remote_address');

        // 2. Gateway IP
        $responseGateway = $this->post('/customers', [
            'name' => 'Cust 3',
            'username' => 'cust3',
            'allocate_random_block' => true,
            'remote_address' => '192.168.172.254',
        ]);
        $responseGateway->assertSessionHasErrors('remote_address');

        // 3. Duplicate Port Block
        $responseBlock = $this->post('/customers', [
            'name' => 'Cust 4',
            'username' => 'cust4',
            'allocate_random_block' => false,
            'port_block' => 1200,
        ]);
        $responseBlock->assertSessionHasErrors('port_block');
    }
}
