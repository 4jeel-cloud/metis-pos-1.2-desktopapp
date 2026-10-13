<template>
    <div id="ns-profile" class="flex ns-box flex-auto flex-col shadow rounded-lg overflow-hidden">
        <div class="flex-auto">
            <div class="head text-center ns-box-header border-b w-full flex justify-between items-center p-2">
                <h5>{{ __( 'Profile' ) }}</h5>
                <div class="flex -mx-1">
                    <div class="px-1">
                        <ns-icon-button class="widget-handle" className="la-expand-arrows-alt"></ns-icon-button>
                    </div>
                    <div class="px-1">
                        <ns-icon-button class-name="la-sync-alt" @click="loadUserProfileWidget(true)"></ns-icon-button>
                    </div>
                    <div class="px-1">
                        <ns-close-button @click="$emit( 'onRemove' )"></ns-close-button>
                    </div>
                </div>
            </div>
            <div class="body">
                <div class="h-40 flex items-center justify-center">
                    <div class="rounded-full border-4 border-secondary bg-primary flex items-center justify-center shadow-lg" style="width:8rem;height:8rem;">
                        <span class="text-white font-bold text-4xl uppercase select-none">{{ (user.username || 'U').charAt(0) }}</span>
                    </div>
                </div>
                <div class="border-t ns-box-body">
                    <ul>
                        <li v-for="(detail, key) of profileDetails" :key="key" class="border-b border-box-edge p-2 flex justify-between">
                            <span>{{ detail.label }}</span>
                            <span>{{ detail.value }}</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
</template>
<script>
import { nsCurrency } from '~/filters/currency';
import { __ } from '~/libraries/lang';

export default {
    name: 'ns-profile-widget',
    components: {},
    data() {
        return {
            svg: '',
            user: ns.user,
            profileDetails: [],
        }
    },
    computed: {
        avatarUrl() {
            return this.url.length === 0 ? '' : this.url;
        }
    },
    mounted() {
        this.loadUserProfileWidget();
    },
    methods: {
        __,
        nsCurrency,
        loadUserProfileWidget( refresh ) {
            nsHttpClient.get( `/api/reports/cashier-report${refresh ? '?refresh=true' : ''}` ).subscribe( result => {
                this.profileDetails     =   result;
            })
        }
    }
}
</script>