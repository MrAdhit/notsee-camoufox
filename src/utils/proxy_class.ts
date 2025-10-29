/**
 * Creates a proxy object that combines a base object with extension properties.
 * 
 * When accessing a property on the resulting proxy, it first checks the base object.
 * If not found in the base, it falls back to the extension object. Methods from the
 * extension are properly bound and callable.
 * 
 * @template B - The type of the base object
 * @template E - The type of the extension object
 * @param base - The primary object to proxy
 * @param extension - The fallback object for additional properties and methods
 * @returns A proxy object combining both base and extension
 * 
 * @example
 * const base = { name: "John" };
 * const extension = { greet: () => "Hello!" };
 * const combined = createProxyClass(base, extension);
 * console.log(combined.name); // "John"
 * console.log(combined.greet()); // "Hello!"
 */
export function createProxyClass<B extends object, E extends object>(base: B, extension: E): B & E {
    return new Proxy(base, {
        get: (_, prop) => {
            if (prop in base)
                return (base as any)[prop];

            if (prop in extension)
                if (typeof (extension as any)[prop] === "function")
                    return (...args: unknown[]) => (extension as any)[prop](...args);
                else
                    return (extension as any)[prop];
        }
    }) as B & E;
}
