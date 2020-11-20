/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, MiddlewareAPI } from 'redux';
import {
  ResolverEntityIndex,
  ResolverNode,
  ResolverGraph,
} from '../../../../common/endpoint/types';
import { ResolverState, DataAccessLayer, TreeIdSchema } from '../../types';
import * as selectors from '../selectors';
import { ResolverAction } from '../actions';

/**
 * A function that handles syncing ResolverTree data w/ the current entity ID.
 * This will make a request anytime the entityID changes (to something other than undefined.)
 * If the entity ID changes while a request is in progress, the in-progress request will be cancelled.
 * Call the returned function after each state transition.
 * This is a factory because it is stateful and keeps that state in closure.
 */
export function ResolverTreeFetcher(
  dataAccessLayer: DataAccessLayer,
  api: MiddlewareAPI<Dispatch<ResolverAction>, ResolverState>
): () => void {
  let lastRequestAbortController: AbortController | undefined;
  // Call this after each state change.
  // This fetches the ResolverTree for the current entityID
  // if the entityID changes while
  return async () => {
    const state = api.getState();
    const databaseParameters = selectors.treeParametersToFetch(state);

    // TODO: Get timeline from selector. @kqualters
    const today = new Date();
    const dayAgo = new Date();
    dayAgo.setDate(today.getDate() - 1);
    const timerange = { from: dayAgo.toISOString(), to: today.toISOString() };

    // TODO: Discuss whether or not we want to hardcode a schema like the below in the front end for now or backend....

    // const schemas = {
    //   winlog: { id: 'process.entity_id', parent: 'process.parent.entitiy_id' },
    //   endpoint: { id: 'process.entity_id', parent: 'process.parent.entitiy_id', ancestry: 'process.Ext.ancestry },
    // };

    const graphRequestIdSchema = {
      id: 'process.entity_id',
      name: 'process.name',
      parent: 'process.parent.entity_id',
      // ancestry: 'process.Ext.ancestry',
    };

    let entityIDToFetch: string | null = null;

    if (selectors.treeRequestParametersToAbort(state) && lastRequestAbortController) {
      lastRequestAbortController.abort();
      // calling abort will cause an action to be fired
    } else if (databaseParameters !== null) {
      lastRequestAbortController = new AbortController();
      let result: ResolverNode[] | undefined;
      // Inform the state that we've made the request. Without this, the middleware will try to make the request again
      // immediately.
      api.dispatch({
        type: 'appRequestedResolverData',
        payload: databaseParameters,
      });
      try {
        // TODO: Update the entities call for the front end to explicitly send what fields to return based on data source
        const matchingEntities: ResolverEntityIndex = await dataAccessLayer.entities({
          _id: databaseParameters.databaseDocumentID,
          indices: databaseParameters.indices ?? [],
          signal: lastRequestAbortController.signal,
        });
        if (matchingEntities.length < 1) {
          // If no entity_id could be found for the _id, bail out with a failure.
          api.dispatch({
            type: 'serverFailedToReturnResolverData',
            payload: databaseParameters,
          });
          return;
        }
        // TODO: Enttities call should return the fields as [{ process: { entity_id: 'blargh' }}] to allow use of the schema.id field
        entityIDToFetch = matchingEntities[0].entity_id;

        result = await dataAccessLayer.resolverGraph(
          entityIDToFetch,
          graphRequestIdSchema,
          timerange,
          databaseParameters.indices ?? []
        );
      } catch (error) {
        // https://developer.mozilla.org/en-US/docs/Web/API/DOMException#exception-AbortError
        if (error instanceof DOMException && error.name === 'AbortError') {
          api.dispatch({
            type: 'appAbortedResolverDataRequest',
            payload: databaseParameters,
          });
        } else {
          api.dispatch({
            type: 'serverFailedToReturnResolverData',
            payload: databaseParameters,
          });
        }
      }
      if (result !== undefined) {
        const resolverGraph: ResolverGraph = {
          // TODO: Should we store this ourselves or have the backend send it back?
          originId: entityIDToFetch,
          nodes: result,
        };

        api.dispatch({
          type: 'serverReturnedResolverData',
          payload: {
            result: resolverGraph,
            parameters: databaseParameters,
          },
        });
      }
    }
  };
}
