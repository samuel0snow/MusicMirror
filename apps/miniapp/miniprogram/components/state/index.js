Component({options:{styleIsolation:'apply-shared'},properties:{busy:Boolean,error:Object},methods:{retry(){this.triggerEvent('retry');}}});
