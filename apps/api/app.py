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
    body = request.get_json(force=True)
    query = body.get("query")
    variables = body.get("variables")

    result = asyncio.run(_execute(query, variables))

    response = {"data": result.data}
    if result.errors:
        response["errors"] = [str(error) for error in result.errors]

    return jsonify(response)


if __name__ == "__main__":
    app.run(debug=True, port=5001)
