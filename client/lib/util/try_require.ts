const E_NOTFOUND = 'MODULE_NOT_FOUND';

export function try_require(modulename: string): any {
    try {
        return require(modulename);
    } catch (error) {
        if (error.code === E_NOTFOUND) {
            return undefined;
        }
        throw error;
    }
}