<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('schedule_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('slug');
            $table->string('color', 7); // #RRGGBB
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();

            $table->unique(['user_id', 'slug']);
        });

        Schema::table('schedule_blocks', function (Blueprint $table) {
            $table->foreignId('schedule_template_id')
                ->nullable()
                ->after('title')
                ->constrained('schedule_templates')
                ->nullOnDelete();
        });

        $defaults = [
            ['slug' => 'sleep', 'name' => 'ძილი', 'color' => '#5b6b8a'],
            ['slug' => 'spiritual', 'name' => 'სულიერი', 'color' => '#7a6a9a'],
            ['slug' => 'physical', 'name' => 'ფიზიკური', 'color' => '#3d9a7a'],
            ['slug' => 'family', 'name' => 'ოჯახი', 'color' => '#c17a4a'],
            ['slug' => 'work', 'name' => 'სამუშაო', 'color' => '#3b82c4'],
            ['slug' => 'reading', 'name' => 'კითხვა', 'color' => '#b8860b'],
            ['slug' => 'leisure', 'name' => 'დასვენება', 'color' => '#6b8f71'],
        ];

        $userIds = DB::table('users')->pluck('id');
        $now = now();

        foreach ($userIds as $userId) {
            $slugToId = [];
            foreach ($defaults as $i => $def) {
                $id = DB::table('schedule_templates')->insertGetId([
                    'user_id' => $userId,
                    'name' => $def['name'],
                    'slug' => $def['slug'],
                    'color' => $def['color'],
                    'position' => $i,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
                $slugToId[$def['slug']] = $id;
            }

            foreach ($slugToId as $slug => $templateId) {
                DB::table('schedule_blocks')
                    ->where('user_id', $userId)
                    ->where('category', $slug)
                    ->update(['schedule_template_id' => $templateId]);
            }
        }

        Schema::table('schedule_blocks', function (Blueprint $table) {
            $table->dropColumn('category');
        });
    }

    public function down(): void
    {
        Schema::table('schedule_blocks', function (Blueprint $table) {
            $table->string('category')->nullable()->after('title');
        });

        $templates = DB::table('schedule_templates')->get(['id', 'user_id', 'slug']);
        foreach ($templates as $tpl) {
            DB::table('schedule_blocks')
                ->where('schedule_template_id', $tpl->id)
                ->update(['category' => $tpl->slug]);
        }

        Schema::table('schedule_blocks', function (Blueprint $table) {
            $table->dropConstrainedForeignId('schedule_template_id');
        });

        Schema::dropIfExists('schedule_templates');
    }
};
