type ToastType = 'success' | 'error' | 'warning' | 'info';
interface ToastMessage {
    type: ToastType;
    text: string;
    duration?: number;
}

class Toast {
    messages: ToastMessage[] = $state([]);   
    
    add(message: ToastMessage) {
        this.messages.push(message);
        setTimeout(() => {
            this.remove(this.messages.indexOf(message));
        }, message.duration || 3000);
    }
    
    remove(index: number) {
        this.messages.splice(index, 1);
    }   
    
    clear() {
        this.messages = [];
    }
}

export const toast = new Toast();
