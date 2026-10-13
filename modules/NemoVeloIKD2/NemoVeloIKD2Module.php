<?php
namespace Modules\NemoVeloIKD2;

use Illuminate\Support\Facades\Event;
use App\Services\Module;

class NemoVeloIKD2Module extends Module
{
    public function __construct()
    {
        parent::__construct( __FILE__ );
    }
}