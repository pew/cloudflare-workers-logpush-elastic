// THIS SOFTWARE IS PROVIDED BY CLOUDFLARE "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES,
// INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL CLOUDFLARE BE LIABLE FOR ANY DIRECT,
// INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES  (INCLUDING, BUT NOT
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR
// BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
// STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE
// USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

import { inflate } from 'pako'

export interface Env {
  elasticHost: string
}

async function sendDocument(bulk: string, stream: string, authHeader: string, env: Env): Promise<Response> {
  const response = await fetch(`${env.elasticHost}/${stream}/_bulk`, {
    method: 'POST',
    body: bulk,
    headers: {
      authorization: authHeader,
      'Content-Type': 'application/json',
    },
  })

  if (response.ok) {
    console.log('documents indexed')
  } else {
    console.error(`error indexing documents: ${response.statusText}`)
  }
  return response
}

function convertToBulkFormat(blob: string, stream: string): string {
  if (typeof blob === 'object') {
    blob = JSON.stringify(blob)
  }
  const output = blob.trim().split('\n')
  console.log('logpush line count:', output.length)
  const documents = output.map((line: string) => JSON.parse(line))
  let bulkData = ''

  for (const document of documents) {
    const indexAction = { index: { _index: stream } }
    bulkData += JSON.stringify(indexAction) + '\n'
    bulkData += JSON.stringify(document) + '\n'
  }
  return bulkData
}

async function transformLogs(
  request: Request<unknown, CfProperties<unknown>>,
  authHeader: string,
  stream: string,
  env: Env,
): Promise<Response> {
  const data = await request.arrayBuffer()
  const log = inflate(data, { to: 'string' })
  const bulk = convertToBulkFormat(log, stream)
  const response = await sendDocument(bulk, stream, authHeader, env)
  return response
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { searchParams } = new URL(request.url)

    const authHeader = request.headers.get('authorization')
    const stream = searchParams.get('stream')

    if (request.method !== 'POST' || !authHeader || !stream) {
      return new Response(
        JSON.stringify({ success: false, message: 'please authenticate and provide your index/stream via the ?stream= query parameter' }),
        {
          headers: { 'content-type': 'application/json' },
        },
      )
    }

    const submit = await transformLogs(request, authHeader, stream, env)
    if (!submit.ok) {
      return new Response(JSON.stringify(submit), { headers: { 'content-type': 'application/json' }, status: submit.status })
    }
    return new Response(JSON.stringify(submit), { headers: { 'content-type': 'application/json' } })
  },
}
