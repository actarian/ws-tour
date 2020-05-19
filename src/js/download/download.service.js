export default class DownloadService {

	static get a() {
		let a = this.a_;
		if (!a) {
			a = document.createElement("a");
			a.style = "display: none";
			document.body.appendChild(a);
			this.a_ = a;
		}
		return a;
	}

	static download(blob, fileName = 'download.txt') {
		// var json = JSON.stringify(data),
		// blob = new Blob([json], {type: "octet/stream"}),
		const url = window.URL.createObjectURL(blob);
		const a = this.a;
		a.href = url;
		a.download = fileName;
		a.click();
		window.URL.revokeObjectURL(url);
	}

}
