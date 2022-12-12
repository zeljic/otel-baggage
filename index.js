import * as api from '@opentelemetry/api';

import {ConsoleSpanExporter, SimpleSpanProcessor, WebTracerProvider} from '@opentelemetry/sdk-trace-web';
import {registerInstrumentations} from '@opentelemetry/instrumentation';
import {Resource} from '@opentelemetry/resources';
import {SemanticResourceAttributes} from '@opentelemetry/semantic-conventions';
import {XMLHttpRequestInstrumentation} from '@opentelemetry/instrumentation-xml-http-request';
import {CompositePropagator, W3CBaggagePropagator, W3CTraceContextPropagator} from '@opentelemetry/core';

const resource = Resource.default().merge(
	new Resource({
		[SemanticResourceAttributes.SERVICE_NAME]: 'webapp',
		[SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0'
	})
);

const provider = new WebTracerProvider({
	resource
});
provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));

const propagator = new CompositePropagator({
	propagators: [
		new W3CTraceContextPropagator(),
		new W3CBaggagePropagator()
	]
});

provider.register({
	propagator
});

api.propagation.setGlobalPropagator(propagator);

registerInstrumentations({
	instrumentations: [
		new XMLHttpRequestInstrumentation({
			applyCustomAttributesOnSpan(span)
			{
				span.setAttribute('now', new Date().toLocaleString());
			}
		})
	],
	tracerProvider: provider
});

const request = (cb) =>
{
	const xhr = new XMLHttpRequest();

	xhr.open('get', '/api');
	xhr.send();

	xhr.addEventListener('load', () =>
	{
		console.log('request done');

		cb();
	});
};

let baggage = api.propagation.getBaggage(api.context.active()) || api.propagation.createBaggage();
baggage = baggage.setEntry('jdx.app.mode', {value: 'wss'});

const ctx = api.propagation.setBaggage(api.context.active(), baggage);

const span = api.trace.getTracer('web-tracer').startSpan('makeRequest', undefined, ctx);

api.context.with(api.trace.setSpan(ctx, span), () => request(() => span.end()));

api.trace.getTracer('web-tracer').startActiveSpan('new span', undefined, baggage, span => request(() => span.end()));