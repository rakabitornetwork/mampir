<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Git remote & branch
    |--------------------------------------------------------------------------
    |
    | Halaman Update menarik perubahan dari remote/branch ini (ff-only).
    |
    */

    'remote' => env('UPDATE_GIT_REMOTE', 'origin'),

    'branch' => env('UPDATE_GIT_BRANCH', 'main'),

    /*
    |--------------------------------------------------------------------------
    | Langkah setelah pull berhasil
    |--------------------------------------------------------------------------
    */

    'run_composer' => env('UPDATE_RUN_COMPOSER', true),

    'run_migrate' => env('UPDATE_RUN_MIGRATE', true),

    'run_optimize_clear' => env('UPDATE_RUN_OPTIMIZE_CLEAR', true),

    /*
    |--------------------------------------------------------------------------
    | Izinkan reset working tree di halaman Update (untuk VPS/deploy)
    |--------------------------------------------------------------------------
    |
    | Jika true, tombol "Reset & Pull" menjalankan git reset --hard + clean -fd
    | lalu pull. File yang di-ignore (.env) tidak terhapus.
    |
    */

    'allow_reset' => env('UPDATE_ALLOW_RESET', true),

];
