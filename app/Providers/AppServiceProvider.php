<?php

namespace App\Providers;

use App\Services\ChrSettingsService;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $chr = $this->app->make(ChrSettingsService::class);

        if ($chr->canUseDatabase()) {
            $chr->seedFromConfigIfEmpty();
            $chr->migrateSshPortToApiIfNeeded();
            $chr->applyToConfig();
        }
    }
}
