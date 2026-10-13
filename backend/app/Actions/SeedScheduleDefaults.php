<?php

namespace App\Actions;

use App\Models\User;

class SeedScheduleDefaults
{
    /**
     * Seed a full weekly template if the user has no schedule blocks yet.
     *
     * @return int number of blocks created
     */
    public function handle(User $user): int
    {
        $templates = (new SeedScheduleTemplates)->handle($user);

        if ($user->scheduleBlocks()->exists()) {
            return 0;
        }

        $rows = [];
        $now = now();

        foreach ($this->weekdayBlocks() as $weekday => $blocks) {
            foreach ($blocks as $index => $block) {
                $templateId = $templates[$block['category']] ?? null;
                if ($templateId === null) {
                    continue;
                }
                $rows[] = [
                    'user_id' => $user->id,
                    'weekday' => $weekday,
                    'start_time' => $block['start'],
                    'end_time' => $block['end'],
                    'title' => $block['title'],
                    'schedule_template_id' => $templateId,
                    'notes' => $block['notes'] ?? null,
                    'position' => $index,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        if ($rows !== []) {
            $user->scheduleBlocks()->insert($rows);
        }

        return count($rows);
    }

    /**
     * @return array<int, list<array{start: string, end: string, title: string, category: string, notes?: string|null}>>
     */
    private function weekdayBlocks(): array
    {
        $workday = [
            ['start' => '06:30', 'end' => '07:00', 'title' => 'გაღვიძება / დილის ლოცვა', 'category' => 'spiritual'],
            ['start' => '07:00', 'end' => '07:30', 'title' => 'ტანვარჯიში / გაწელვები', 'category' => 'physical'],
            ['start' => '07:30', 'end' => '08:30', 'title' => 'ბავშვების სკოლაში/ბაღში წაყვანა', 'category' => 'family'],
            ['start' => '09:00', 'end' => '13:00', 'title' => 'სამუშაო (დილა)', 'category' => 'work'],
            ['start' => '13:00', 'end' => '14:00', 'title' => 'სადილი', 'category' => 'leisure'],
            ['start' => '14:00', 'end' => '18:00', 'title' => 'სამუშაო (შუადღე)', 'category' => 'work'],
            ['start' => '18:00', 'end' => '19:00', 'title' => 'ბავშვების გამოყვანა / ტრანსპორტი', 'category' => 'family'],
            ['start' => '19:00', 'end' => '21:00', 'title' => 'ოჯახური დრო / ძილისთვის მომზადება', 'category' => 'family'],
            ['start' => '21:00', 'end' => '22:00', 'title' => 'კითხვის საათი', 'category' => 'reading'],
            ['start' => '22:00', 'end' => '22:30', 'title' => 'საღამოს ლოცვა', 'category' => 'spiritual'],
            ['start' => '22:30', 'end' => '06:30', 'title' => 'ძილი', 'category' => 'sleep'],
        ];

        $saturday = [
            ['start' => '07:00', 'end' => '07:30', 'title' => 'გაღვიძება / დილის ლოცვა', 'category' => 'spiritual'],
            ['start' => '07:30', 'end' => '08:30', 'title' => 'ტანვარჯიში', 'category' => 'physical'],
            ['start' => '09:00', 'end' => '12:00', 'title' => 'საყიდლები / საოჯახო საქმეები', 'category' => 'leisure'],
            ['start' => '12:00', 'end' => '14:00', 'title' => 'ოჯახური დრო', 'category' => 'family'],
            ['start' => '14:00', 'end' => '18:00', 'title' => 'ოჯახური გასვლა', 'category' => 'family'],
            ['start' => '18:00', 'end' => '20:00', 'title' => 'საღამო ოჯახთან', 'category' => 'family'],
            ['start' => '20:00', 'end' => '21:00', 'title' => 'კითხვის საათი', 'category' => 'reading'],
            ['start' => '21:00', 'end' => '21:30', 'title' => 'საღამოს ლოცვა', 'category' => 'spiritual'],
            ['start' => '21:30', 'end' => '22:30', 'title' => 'მომავალი კვირის დაგეგმვა', 'category' => 'leisure'],
            ['start' => '22:30', 'end' => '07:00', 'title' => 'ძილი', 'category' => 'sleep'],
        ];

        $sunday = [
            ['start' => '07:00', 'end' => '07:30', 'title' => 'გაღვიძება / დილის ლოცვა', 'category' => 'spiritual'],
            ['start' => '08:00', 'end' => '11:00', 'title' => 'ტაძარი', 'category' => 'spiritual'],
            ['start' => '11:00', 'end' => '13:00', 'title' => 'ოჯახური დრო', 'category' => 'family'],
            ['start' => '13:00', 'end' => '15:00', 'title' => 'სადილი / დასვენება', 'category' => 'leisure'],
            ['start' => '15:00', 'end' => '18:00', 'title' => 'ოჯახური გასვლა / დასვენება', 'category' => 'family'],
            ['start' => '18:00', 'end' => '20:00', 'title' => 'საღამო ოჯახთან', 'category' => 'family'],
            ['start' => '20:00', 'end' => '21:00', 'title' => 'კითხვის საათი', 'category' => 'reading'],
            ['start' => '21:00', 'end' => '21:30', 'title' => 'საღამოს ლოცვა', 'category' => 'spiritual'],
            ['start' => '21:30', 'end' => '22:30', 'title' => 'მომავალი კვირის დაგეგმვა', 'category' => 'leisure'],
            ['start' => '22:30', 'end' => '06:30', 'title' => 'ძილი', 'category' => 'sleep'],
        ];

        return [
            1 => $workday,
            2 => $workday,
            3 => $workday,
            4 => $workday,
            5 => $workday,
            6 => $saturday,
            7 => $sunday,
        ];
    }
}
