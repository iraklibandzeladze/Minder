<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sheets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('slug');
            $table->string('kind')->default('table'); // ledger | table
            $table->unsignedInteger('position')->default(0);
            $table->boolean('is_default')->default(false);
            $table->timestamps();

            $table->unique(['user_id', 'slug']);
        });

        Schema::create('sheet_rows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sheet_id')->constrained()->cascadeOnDelete();
            $table->string('title')->nullable();
            $table->jsonb('values')->default(DB::raw("'{}'::jsonb"));
            $table->text('notes')->nullable();
            $table->string('year_month', 7)->nullable();
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();

            $table->index(['sheet_id', 'year_month']);
            $table->index(['user_id', 'sheet_id']);
        });

        Schema::table('custom_columns', function (Blueprint $table) {
            $table->foreignId('sheet_id')->nullable()->after('user_id')->constrained('sheets')->cascadeOnDelete();
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->foreignId('sheet_id')->nullable()->after('user_id')->constrained('sheets')->nullOnDelete();
        });

        $users = User::query()->get(['id']);
        foreach ($users as $user) {
            $sheetId = DB::table('sheets')->insertGetId([
                'user_id' => $user->id,
                'name' => 'ფინანსები',
                'slug' => 'ledger',
                'kind' => 'ledger',
                'position' => 0,
                'is_default' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('custom_columns')->where('user_id', $user->id)->update(['sheet_id' => $sheetId]);
            DB::table('transactions')->where('user_id', $user->id)->update(['sheet_id' => $sheetId]);
        }
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('sheet_id');
        });
        Schema::table('custom_columns', function (Blueprint $table) {
            $table->dropConstrainedForeignId('sheet_id');
        });
        Schema::dropIfExists('sheet_rows');
        Schema::dropIfExists('sheets');
    }
};
