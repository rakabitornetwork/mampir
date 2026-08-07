<?php

namespace Database\Seeders;

use App\Models\SubscriptionPlan;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::query()->updateOrCreate(
            ['email' => 'amon@teslatech.my.id'],
            [
                'name' => 'Amon Admin',
                'password' => Hash::make('gantengmax'),
                'email_verified_at' => now(),
            ]
        );

        $plans = [
            ['name' => 'Mingguan', 'slug' => 'mingguan', 'duration_days' => 7, 'price' => 50000, 'sort_order' => 1, 'description' => 'Uji coba / event singkat'],
            ['name' => 'Bulanan', 'slug' => 'bulanan', 'duration_days' => 30, 'price' => 150000, 'sort_order' => 2, 'description' => 'Paket standar ISP mitra'],
            ['name' => 'Triwulan', 'slug' => 'triwulan', 'duration_days' => 90, 'price' => 400000, 'sort_order' => 3, 'description' => 'Hemat 3 bulan'],
            ['name' => 'Tahunan', 'slug' => 'tahunan', 'duration_days' => 365, 'price' => 1400000, 'sort_order' => 4, 'description' => 'Komitmen jangka panjang'],
        ];

        foreach ($plans as $plan) {
            SubscriptionPlan::query()->updateOrCreate(
                ['slug' => $plan['slug']],
                $plan + ['currency' => 'IDR', 'is_active' => true]
            );
        }
    }
}
