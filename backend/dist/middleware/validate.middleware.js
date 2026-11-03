"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
function validate(schema) {
    return (request, _response, next) => {
        schema.parse({
            body: request.body,
            params: request.params,
            query: request.query,
        });
        next();
    };
}
//# sourceMappingURL=validate.middleware.js.map