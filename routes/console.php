<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('chr:sync')->everyFiveMinutes();
Schedule::command('chr:expire')->everyFiveMinutes();
Schedule::command('chr:cleanup-expired --days=30')->daily();
