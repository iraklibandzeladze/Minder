<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Word;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ScheduleAndDictionaryTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config(['database.default' => 'sqlite', 'database.connections.sqlite.database' => ':memory:']);
        // Isolate these APIs from PostgreSQL-only ledger and trigram-index migrations.
        foreach ([
            '0001_01_01_000000_create_users_table.php',
            '2026_09_21_170000_add_platform_role_and_plan_to_users_table.php',
            '2026_09_21_120000_create_schedule_blocks_table.php',
            '2026_09_21_150000_create_schedule_templates_table.php',
        ] as $migration) {
            (require database_path('migrations/'.$migration))->up();
        }
        foreach (['sheets', 'notes'] as $name) {
            Schema::create($name, function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id');
            });
        }
        Schema::create('words', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained();
            $table->string('english_word', 180);
            $table->text('georgian_translation');
            $table->text('example_sentence_en')->nullable();
            $table->text('example_sentence_ka')->nullable();
            $table->timestamps();
        });
        (require database_path('migrations/2026_09_23_160000_create_word_categories_table.php'))->up();
    }

    public function test_new_registration_starts_empty_and_can_build_and_clear_a_schedule(): void
    {
        $response = $this->withHeader('Origin', 'http://localhost:5173')->postJson('/api/register', [
            'name' => 'ახალი', 'email' => 'new@example.com',
            'password' => 'test-password', 'password_confirmation' => 'test-password',
        ])->assertCreated();
        Sanctum::actingAs(User::findOrFail($response->json('user.id')));
        $this->getJson('/api/schedule-blocks')->assertOk()->assertJsonPath('data', []);
        $templates = $this->getJson('/api/schedule-templates')->assertOk()->json('data');
        $this->assertNotEmpty($templates);
        $this->getJson('/api/schedule-blocks')->assertOk()->assertJsonPath('data', []);
        $block = $this->postJson('/api/schedule-blocks', [
            'weekday' => 1, 'start_time' => '09:00', 'end_time' => '10:00',
            'title' => 'ჩემი გეგმა', 'schedule_template_id' => $templates[0]['id'],
        ])->assertCreated();
        $this->getJson('/api/schedule-blocks')->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'ჩემი გეგმა');
        $this->deleteJson('/api/schedule-blocks/'.$block->json('data.id'))->assertOk();
        $this->getJson('/api/schedule-blocks')->assertOk()->assertJsonPath('data', []);
    }

    public function test_georgian_examples_survive_create_update_and_reload(): void
    {
        Sanctum::actingAs(User::factory()->create(['plan' => 'pro']));
        $payload = [
            'english_word' => 'friend', 'georgian_translation' => 'მეგობარი',
            'example_sentence_en' => 'My friend is here.',
            'example_sentence_ka' => '  ჩემი მეგობარი აქ არის — გამარჯობა!  ', 'category_ids' => [],
        ];
        $created = $this->postJson('/api/words', $payload)->assertCreated()
            ->assertJsonPath('data.example_sentence_ka', trim($payload['example_sentence_ka']));
        $id = $created->json('data.id');
        $this->assertSame(trim($payload['example_sentence_ka']), Word::findOrFail($id)->example_sentence_ka);
        $payload['example_sentence_ka'] = 'ᲒᲐᲛᲐᲠᲯᲝᲑᲐ! ახალი მაგალითი: „მეგობარი“.';
        $this->patchJson("/api/words/{$id}", $payload)->assertOk()
            ->assertJsonPath('data.example_sentence_ka', $payload['example_sentence_ka']);
        $this->getJson('/api/words')->assertOk()->assertJsonPath('data.0.example_sentence_ka', $payload['example_sentence_ka']);
        $this->assertSame($payload['example_sentence_ka'], Word::findOrFail($id)->example_sentence_ka);
        $payload['example_sentence_ka'] = '';
        $this->patchJson("/api/words/{$id}", $payload)->assertOk()->assertJsonPath('data.example_sentence_ka', null);
        $this->assertNull(Word::findOrFail($id)->example_sentence_ka);
    }

    public function test_georgian_example_length_is_validated(): void
    {
        Sanctum::actingAs(User::factory()->create(['plan' => 'pro']));
        $this->postJson('/api/words', [
            'english_word' => 'word', 'georgian_translation' => 'სიტყვა',
            'example_sentence_ka' => str_repeat('ა', 4001), 'category_ids' => [],
        ])->assertUnprocessable()->assertJsonValidationErrors('example_sentence_ka');
    }
}
