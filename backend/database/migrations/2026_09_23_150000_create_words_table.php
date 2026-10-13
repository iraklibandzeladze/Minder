<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');

        Schema::create('words', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('english_word', 180);
            $table->text('georgian_translation');
            $table->text('example_sentence_en')->nullable();
            $table->text('example_sentence_ka')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'english_word']);
        });

        DB::statement('CREATE INDEX words_english_word_trgm ON words USING gin (english_word gin_trgm_ops)');
        DB::statement('CREATE INDEX words_georgian_translation_trgm ON words USING gin (georgian_translation gin_trgm_ops)');
        DB::statement('CREATE INDEX words_example_en_trgm ON words USING gin (example_sentence_en gin_trgm_ops)');
        DB::statement('CREATE INDEX words_example_ka_trgm ON words USING gin (example_sentence_ka gin_trgm_ops)');
    }

    public function down(): void
    {
        Schema::dropIfExists('words');
    }
};
