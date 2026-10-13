<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('check_mode')->default('checkbox'); // checkbox | radio
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();

            $table->index(['user_id', 'position']);
        });

        Schema::create('note_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('note_id')->constrained('notes')->cascadeOnDelete();
            $table->string('body')->default('');
            $table->boolean('checked')->default(false);
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();

            $table->index(['note_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('note_items');
        Schema::dropIfExists('notes');
    }
};
