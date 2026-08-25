import asyncio

from flask import Flask, jsonify, request
from flask_cors import CORS

from loaders import CrewLoader
from models import db_session
from schema import schema

app = Flask(__name__)
CORS(app)


@app.teardown_appcontext
def remove_session(exception=None):
    db_session.remove()


@app.get("/health")
def health():
    return {"status": "ok"}


async def _execute(query, variables):
    # CrewLoader() has to be built inside the coroutine, not before it:
    # aiodataloader grabs the running event loop at construction time,
    # and asyncio.run() below doesn't create one until this coroutine
    # actually starts.
    return await schema.execute_async(
        query,
        variable_values=variables,
        context_value={"crew_loader": CrewLoader()},
    )


@app.post("/graphql")
def graphql():
    body = request.get_json(silent=True)
    if not isinstance(body, dict) or not body.get("query"):
        return jsonify({"errors": ["Malformed request: a 'query' string is required"]}), 400

    query = body["query"]
    variables = body.get("variables")

    result = asyncio.run(_execute(query, variables))

    response = {"data": result.data}
    if result.errors:
        response["errors"] = [_safe_error(error) for error in result.errors]

    return jsonify(response)


def _safe_error(error):
    """Keep raw exception text out of the response.

    A GraphQL-level error (a bad query, an unknown field) has no
    `original_error` and is safe to surface — the client needs to see it to
    fix the request. A resolver that *threw* carries its exception in
    `original_error`; that text can hold a stack, a SQL statement, or a
    connection string, so it's logged server-side and replaced with a
    generic message. Business-rule errors never reach here: they ride the
    mutation payload's `errors` field, not the transport (see
    schema/types.py, `Error`).
    """
    original = getattr(error, "original_error", None)
    if original is None:
        return str(error)

    app.logger.error("Unhandled resolver error", exc_info=original)
    return "Internal server error"


if __name__ == "__main__":
    app.run(debug=True, port=5001)
