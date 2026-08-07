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

];
