# @brycemarshall/timeout

Includes: 
1. A Promise implementation that supports automatic timeout rejection; and 
2. An function that starts an asynchronous timeout sequence which continues for a specified duration or until it is cancelled.

## Installation (Latest Build)

npm install @brycemarshall/timeout

## IMPORTANT! Installation (Versioned Builds)

The @brycemarshall/timeout function is published on NPM with the following builds:

version 3 -- Full native support for the ES2017 async keyword and await expression (the most compact build).
npm install @brycemarshall/timeout@latest 
OR
npm install @brycemarshall/timeout@es2017
OR
npm install @brycemarshall/timeout@"^3"

version 2 -- Downlevelled to support ES2015 runtimes using generator functions and the yield keyword.
npm install @brycemarshall/timeout@es2015 
OR
npm install @brycemarshall/timeout@"^2"

version 1 -- Downlevelled to support ES3/ES5 runtimes using generator and awaiter functions (the least compact build - you'll probably need this build if you're targeting a browser).
npm install @brycemarshall/timeout@es5 
OR
npm install @brycemarshall/timeout@"^1"

## The module exports the following:

```ts
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
export declare function timeout(cancelFunction: (state?: any) => boolean, timeoutFunction: (state?: any) => void, duration: number, interval?: number, state?: any): Promise<void>;
/**
 * A Promise implementation that automatically rejects with a time-out error if it is has not been explicitly resolved or rejected after a specified duration.
 * @class TimeoutPromise<T>
 */
export declare class TimeoutPromise<T> implements Promise<T> {
    /** @internal */
    private _internal;
    /**
     * Creates a new TimeoutPromise
     * @param executor A callback used to initialize the TimeoutPromise. This callback is passed two arguments:
     * a resolve callback used to resolve the TimeoutPromise with a value or the result another Promise,
     * and a reject callback used to reject the TimeoutPromise with a provided reason or error.
     * @param duration The period after which the Promise will timeout if it has not been explicitly resolved or rejected.
     * @param timeoutMessage An optional timeout message to be passed to the Error contructor when an error is raised upon timeout.
     */
    constructor(executor: (resolve: (value?: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void, duration: number, timeoutMessage?: string);
    readonly [Symbol.toStringTag]: "Promise";
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): Promise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): Promise<T | TResult>;
}
```

## Usage

``` ts
import { timeout } from '@brycemarshall/timeout';

class Tests {
    static async execute() {
        let tests = new Tests();
        for(const t of Object.getOwnPropertyNames(Tests.prototype)){        
            if (t === "constructor") continue;
            console.log("Starting test \"" + t + "\"");
            await tests[t]();
            console.log("Completed test \"" + t + "\"");
            console.log("");
        }
    }

    async  testTimeout() {
        let timedout = false;
        await timeout(
            (): boolean => {
                return false;
            },
            () => {
                timedout = true;
                Tests.logPassed("Timed-out as expected.")
            },
            1000);

        if (!timedout)
            Tests.logFailed("Failed to time-out.")
    }

    async  testCancelTimeout() {
        let timedout = false;
        await timeout(
            (): boolean => {
                return true;
            },
            () => {
                timedout = true;
                Tests.logFailed("Timed-out")
            },
            10000);

        if (!timedout)
            Tests.logPassed("Completed without timing-out.")
    }

    async  testTimeoutCancelFnError() {
        await timeout(
            (): boolean => {
                throw new Error("TEST");
            },
            () => {
                Tests.logFailed("Timed-out.")
            },
            1000).catch((reason) => {
                if (reason.message == "TEST")
                    Tests.logPassed("TEST error captured")
                else
                    Tests.logFailed("Unexpected error.")
            });
    }

    async  testTimeoutTimeoutFnError() {
        await timeout(
            (): boolean => {
                return false;
            },
            () => {
                throw new Error("TEST");
            },
            1000).catch((reason) => {
                if (reason.message == "TEST")
                    Tests.logPassed("TEST error captured")
                else
                    Tests.logFailed("Unexpected error.")
            });
    }

    async  testTimeoutPromise() {
        await new TimeoutPromise<string>(async (resolve, reject) => {
            console.log("Sleeping for 1 second")
            setTimeout(() => {
                console.log("Resolving");
                resolve("success");
            }, 1000);
        }, 5000)
            .then(() => { Tests.logPassed("The promise resolved before the timeout."); })
            // A timeout WILL raise an error that must be handled by this promise, a parent promise, or a try/catch clause.
            .catch((reason) => {
                Tests.logFailed(reason.message);
                Tests.logRejectedPromise(reason);
            });
    }

    async testTimeoutPromiseTimeout() {
        await new TimeoutPromise<string>((resolve, reject) => { }, 500)
            .then(() => { Tests.logFailed("The promise resolved without timing-out."); })
            // A timeout WILL raise an error that must be handled by this promise, a parent promise, or a try/catch clause.
            .catch((reason) => {
                if (reason.isTimeoutException)
                    Tests.logPassed("The Promise timed-out.");
                else
                    Tests.logFailed("Unexpected error.")

                Tests.logRejectedPromise(reason);
            });
    }

    static logPassed(message: string) {
        console.log("PASSED: " + message);
    }

    static logFailed(message: string) {
        console.log("FAILED: " + message);
    }

    static logRejectedPromise(reason) {
        console.log("The Promise was rejected with the following message:");
        console.log('"' + reason.message + '"');
    }
}

Tests.execute();
```
## Contributors

 - Bryce Marshall

## MIT Licenced
