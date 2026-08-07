<?php

use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ScriptController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\SyncController;
use App\Http\Controllers\UpdateController;
use Illuminate\Support\Facades\Route;

Route::middleware('guest')->group(function () {
    Route::get('/login', [LoginController::class, 'create'])->name('login');
    Route::post('/login', [LoginController::class, 'store']);
});

Route::middleware('auth')->group(function () {
    Route::post('/logout', [LoginController::class, 'destroy'])->name('logout');
    Route::get('/', DashboardController::class)->name('dashboard');

    Route::resource('customers', CustomerController::class);
    Route::post('/customers/{customer}/renew', [CustomerController::class, 'renew'])->name('customers.renew');
    Route::post('/customers/{customer}/push', [CustomerController::class, 'push'])->name('customers.push');

    Route::get('/scripts', [ScriptController::class, 'index'])->name('scripts.index');
    Route::get('/scripts/{customer}/{type}', [ScriptController::class, 'download'])->name('scripts.download');

    Route::get('/sync', [SyncController::class, 'index'])->name('sync.index');
    Route::post('/sync/pull', [SyncController::class, 'pull'])->name('sync.pull');
    Route::post('/sync/expire', [SyncController::class, 'expire'])->name('sync.expire');

    Route::get('/settings', [SettingsController::class, 'index'])->name('settings.index');
    Route::put('/settings/chr', [SettingsController::class, 'updateChr'])->name('settings.chr.update');
    Route::post('/settings/plans', [SettingsController::class, 'storePlan'])->name('settings.plans.store');
    Route::delete('/settings/plans/{plan}', [SettingsController::class, 'destroyPlan'])->name('settings.plans.destroy');

    Route::get('/update', [UpdateController::class, 'index'])->name('update.index');
    Route::post('/update/check', [UpdateController::class, 'check'])->name('update.check');
    Route::post('/update/pull', [UpdateController::class, 'pull'])->name('update.pull');
    Route::post('/update/reset-pull', [UpdateController::class, 'resetAndPull'])->name('update.reset-pull');
});
