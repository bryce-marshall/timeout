/**
 * A function that starts an asynchronous timeout sequence that continues for a specified duration or until it is cancelled.
 * 
 * 
 * Error Handling:
 * 
 * 1. The timeout function does not raise an error upon timeout. This behaviour is by design, as it precludes the requirement for client code to either
 * attach a ".catch" handler to the Promise returned by the asyncrhonouse "timeout" method, or to wrap "await timeout(...)" invocations in a try/catch block.
 * Rather, the timeout event MUST be handled by the timeout function.
 * 
 * 2. The Promise returned by the aysnchronous "timeout" method WILL be rejected IF an unhandled exception occurs within the cancel or timeout functions.
 * 
 * 3. To follow a strict Promise implementation (where the timeout is raised as an Error that must be handled within the Promise framework) use a TimeoutPromise.  
 * [import { TimeoutPromise } from '@brycemarshall/timeout';]
 * @param cancelFunction A function that is invoked at the frequency specified by the interval parameter. Returning a "truthy" value from this function cancels the timeout sequence.
 * @param timeoutFunction A function that is invoked upon timeout (which occurs if the timeout sequence completes without being cancelled).
 * @param duration The duration (in milliseconds) of the timeout sequence.
 * @param interval The frequency (in milliseconds) at which the cancelFunction will be invoked. The default value is 100.
 * @param state Optional state which will be passed to the cancel and timeout functions.
 */
export async function timeout(cancelFunction: (state?: any) => boolean, timeoutFunction: (state?: any) => void, duration: number, interval?: number, state?: any) {
    if (!duration)
        duration = 0;

    if (interval == null)
        interval = 100;

    let s: number = Date.now();
    let resolveFn: () => void;
    let rejectFn: (reason?: any) => void;
    let elapsed: number = 0;

    let timeout = () => {
        setTimeout(() => {
            try {
                elapsed = Date.now() - s;
                if (elapsed >= duration) {
                    timeoutFunction(state);
                    resolveFn();
                }
                else if (cancelFunction && cancelFunction(state))
                    resolveFn();
                else {
                    timeout();
                }
            } catch (e) {
                rejectFn(e);
            }
        }, Math.min(duration - elapsed, interval));
    };

    await new Promise<void>((rs, rj) => {
        resolveFn = rs;
        rejectFn = rj;
        timeout();
    });
}

/**
 * A Promise implementation that automatically rejects with a time-out error if it is has not been explicitly resolved or rejected after a specified duration.
 * @class TimeoutPromise<T>
 */
export class TimeoutPromise<T> implements Promise<T> {
    /** @internal */
    private _internal: Promise<T>;

    /**
     * Creates a new TimeoutPromise
     * @param executor A callback used to initialize the TimeoutPromise. This callback is passed two arguments:
     * a resolve callback used to resolve the TimeoutPromise with a value or the result another Promise,
     * and a reject callback used to reject the TimeoutPromise with a provided reason or error.
     * @param duration The period after which the Promise will timeout if it has not been explicitly resolved or rejected.
     * @param timeoutMessage An optional timeout message to be passed to the Error contructor when an error is raised upon timeout.
     */
    constructor(executor: (resolve: (value?: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void, duration: number, timeoutMessage?: string) {
        let completed: boolean = false;
        let rjct: (reason?: any) => void = null;

        try {
            this._internal = new Promise<T>(
                (resolve, reject) => {
                    rjct = reject;
                    executor(
                        (value?: T | PromiseLike<T>) => {
                            if (completed) return;
                            completed = true;
                            resolve(value);
                        },
                        (reason?: any) => {
                            if (completed) return;
                            completed = true;
                            reject(reason);
                        });
                }
            );

            if (completed) return;

            timeout(
                (): boolean => {
                    return completed;
                },
                (): void => {
                    if (completed) return;
                    completed = true;
                    rjct(Exception.createTimeout());
                },
                duration, 50).catch((reason) => { if (!completed) { completed = true; rjct(reason); } });
        }
        catch (e) {
            rjct(e);
        }
    }

    readonly [Symbol.toStringTag]: "Promise";

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): Promise<TResult1 | TResult2> {
        return this._internal.then(onfulfilled, onrejected);
    }
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): Promise<T | TResult> {
        return this._internal.catch(onrejected);
    }
}

// Mimic @brycemarshall/exception
class Exception extends Error {
    constructor(name: string, message?: string) {
        super(message);
        this.name = name;
        this.message = message != null ? message : "Error of type " + name;;
        name = "is" + name + "Exception";

        // When called from the Exception contructor, the following is to work-around the Typescript ES5 compiler bug that incorrectly subclasses the Error object resulting in members defined on the immediate subclass being lost.
        // See https://github.com/Microsoft/TypeScript/issues/10166
        if (this["isException"] == undefined) {
            (<any>this)["isException"] = Exception.prototype.isException;
            (<any>this)["toString"] = Exception.prototype.toString;
        }

        // For custom exceptions or other subclassed exceptions where the "is...Exception" property has not been defined.
        if (this[name] == undefined) {
            this[name] = Exception.prototype.isException;
        }
    }

    get isException(): boolean {
        return true;
    }

    public toString(): string {
        let name = this.name + " Error";
        
        if (typeof this.message == "string" && this.message.length > 0)
            return name + ": " + this.message;

        return this.name;
    }    

    static createTimeout(): Exception {
        return new Exception("Timeout", "Operation timed-out before completing.")        
    }
}
