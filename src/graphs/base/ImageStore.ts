import JSZip from "jszip";

class ImageStoreSingleton {
    storedImages: Blob[] = [];
    imageNames: string[] = [];

    addImage(blob: Blob, name: string) {
        this.storedImages.push(blob);
        this.imageNames.push(name);
    }

    clear() {
        this.storedImages = [];
        this.imageNames = [];
    }

    async createZip() {
        const zip = new JSZip();
        this.storedImages.forEach(((blob, i) => zip.file(this.imageNames[i] + '.png', blob)));
        const content = await zip.generateAsync({type: "blob"});
        const link = document.createElement('a');
        link.download = 'slike.zip';
        link.href = window.URL.createObjectURL(content);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        this.clear();
    }
}

export const ImageStore = new ImageStoreSingleton();
