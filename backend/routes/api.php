<?php

use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\AdminUserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CustomColumnController;
use App\Http\Controllers\Api\FolderController;
use App\Http\Controllers\Api\MonthController;
use App\Http\Controllers\Api\NoteController;
use App\Http\Controllers\Api\NoteItemController;
use App\Http\Controllers\Api\PasswordRecoveryController;
use App\Http\Controllers\Api\ProRequestController;
use App\Http\Controllers\Api\QuickEntryController;
use App\Http\Controllers\Api\RecurringTemplateController;
use App\Http\Controllers\Api\ResourceShareController;
use App\Http\Controllers\Api\ScheduleBlockController;
use App\Http\Controllers\Api\ScheduleTemplateController;
use App\Http\Controllers\Api\SheetController;
use App\Http\Controllers\Api\SheetRowController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\WordCategoryController;
use App\Http\Controllers\Api\WordController;
use Illuminate\Support\Facades\Route;

Route::post('/forgot-password', [PasswordRecoveryController::class, 'forgot'])->middleware('throttle:5,1');
Route::post('/reset-password', [PasswordRecoveryController::class, 'reset'])->middleware('throttle:5,1');

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::get('/invites/{token}', [ResourceShareController::class, 'preview']);

Route::middleware(['auth:sanctum', 'not.blocked'])->group(function () {
    Route::apiResource('folders', FolderController::class)->except(['show', 'destroy']);
    Route::delete('/folders/{folder}', [FolderController::class, 'destroy'])->middleware('throttle:5,1');
    Route::post('/sheets/{sheet}/recover-password', [PasswordRecoveryController::class, 'sheet'])->middleware('throttle:5,1');
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::patch('/me', [AuthController::class, 'update']);
    Route::post('/me/pro-request', [ProRequestController::class, 'store']);
    Route::delete('/me/pro-request', [ProRequestController::class, 'destroy']);

    Route::middleware('platform.admin')->prefix('admin')->group(function () {
        Route::get('/stats', [AdminUserController::class, 'stats']);
        Route::get('/users', [AdminUserController::class, 'index']);
        Route::patch('/users/{user}', [AdminUserController::class, 'update']);
    });

    Route::post('/invites/{token}/accept', [ResourceShareController::class, 'accept']);
    Route::get('/shares', [ResourceShareController::class, 'index']);
    Route::post('/shares', [ResourceShareController::class, 'store']);
    Route::delete('/shares/{resourceShare}', [ResourceShareController::class, 'destroy']);

    Route::apiResource('accounts', AccountController::class)->except(['show']);
    Route::apiResource('categories', CategoryController::class)->except(['show']);
    Route::apiResource('sheets', SheetController::class)->except(['show']);
    Route::post('/sheets/{sheet}/rollover', [SheetController::class, 'rollover']);
    Route::post('/sheets/{sheet}/unlock', [SheetController::class, 'unlock']);
    Route::post('/sheets/{sheet}/lock', [SheetController::class, 'lock']);
    Route::apiResource('sheet-rows', SheetRowController::class)->except(['show'])->parameters([
        'sheet-rows' => 'sheetRow',
    ]);
    Route::apiResource('custom-columns', CustomColumnController::class)->except(['show'])->parameters([
        'custom-columns' => 'customColumn',
    ]);
    Route::post('/custom-columns/reorder', [CustomColumnController::class, 'reorder']);
    Route::apiResource('templates', RecurringTemplateController::class)->except(['show'])->parameters([
        'templates' => 'recurringTemplate',
    ]);
    Route::post('/templates/{recurringTemplate}/apply', [RecurringTemplateController::class, 'apply']);

    Route::apiResource('transactions', TransactionController::class)->except(['show']);
    Route::apiResource('schedule-blocks', ScheduleBlockController::class)->except(['show'])->parameters([
        'schedule-blocks' => 'scheduleBlock',
    ]);
    Route::apiResource('schedule-templates', ScheduleTemplateController::class)->except(['show'])->parameters([
        'schedule-templates' => 'scheduleTemplate',
    ]);
    Route::apiResource('notes', NoteController::class)->except(['show']);
    Route::apiResource('words', WordController::class)->except(['show']);
    Route::apiResource('word-categories', WordCategoryController::class)->only(['index', 'store', 'destroy'])->parameters([
        'word-categories' => 'wordCategory',
    ]);
    Route::post('/notes/{note}/unlock', [NoteController::class, 'unlock']);
    Route::post('/notes/{note}/lock', [NoteController::class, 'lock']);
    Route::apiResource('note-items', NoteItemController::class)->except(['index', 'show'])->parameters([
        'note-items' => 'noteItem',
    ]);

    Route::post('/quick-entry/preview', [QuickEntryController::class, 'preview']);
    Route::post('/quick-entry', [QuickEntryController::class, 'store']);

    Route::get('/month', [MonthController::class, 'show']);
    Route::put('/month/note', [MonthController::class, 'updateNote']);
});
