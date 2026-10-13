<?php

return [
    'free' => [
        'label' => 'უფასო',
        'max_sheets' => 5,
        'max_notes' => 15,
        'max_words' => 200,
        'can_share' => false,
        'can_password_protect' => false,
    ],
    'pro' => [
        'label' => 'Pro',
        'max_sheets' => null,
        'max_notes' => null,
        'max_words' => null,
        'can_share' => true,
        'can_password_protect' => true,
    ],
];
