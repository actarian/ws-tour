import { CoreModule, Module } from 'rxcomp';
import { FormModule } from 'rxcomp-form';
import AgoraDevicePreviewComponent from './agora/agora-device-preview.component';
import AgoraDeviceComponent from './agora/agora-device.component';
import AgoraStreamComponent from './agora/agora-stream.component';
import AppComponent from './app.component';
import ControlRequestComponent from './control-request/control-request.component';
import DropDirective from './drop/drop.directive';
import DropdownItemDirective from './dropdown/dropdown-item.directive';
import DropdownDirective from './dropdown/dropdown.directive';
import ControlCustomSelectComponent from './forms/control-custom-select.component';
import ControlTextComponent from './forms/control-text.component';
import IdDirective from './id/id.directive';
import ModalOutletComponent from './modal/modal-outlet.component';
import ModalComponent from './modal/modal.component';
import SliderDirective from './slider/slider.directive';
import TryInARComponent from './try-in-ar/try-in-ar';
import ValueDirective from './value/value.directive';
import HlsDirective from './video/hls.directive';
import ModelGltfComponent from './world/model/model-gltf.component';
import ModelNavComponent from './world/model/model-nav.component';
import ModelPanelComponent from './world/model/model-panel.component';
import ModelPictureComponent from './world/model/model-picture.component';
import ModelTextComponent from './world/model/model-text.component';
import ModelComponent from './world/model/model.component';
import WorldComponent from './world/world.component';

export class AppModule extends Module {}

AppModule.meta = {
	imports: [
		CoreModule,
		FormModule,
	],
	declarations: [
		AgoraDeviceComponent,
		AgoraDevicePreviewComponent,
		AgoraStreamComponent,
		ControlCustomSelectComponent,
		ControlRequestComponent,
		ControlTextComponent,
		DropDirective,
		DropdownDirective,
		DropdownItemDirective,
		HlsDirective,
		IdDirective,
		ModalComponent,
		ModalOutletComponent,
		ModelComponent,
		ModelGltfComponent,
		ModelPictureComponent,
		ModelTextComponent,
		ModelNavComponent,
		ModelPanelComponent,
		SliderDirective,
		TryInARComponent,
		ValueDirective,
		WorldComponent,
	],
	bootstrap: AppComponent,
};
