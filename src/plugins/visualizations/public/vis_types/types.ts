/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { IconType } from '@elastic/eui';
import React from 'react';
import { Adapters } from 'src/plugins/inspector';
import { IndexPattern } from 'src/plugins/data/public';
import { VisEditorConstructor } from 'src/plugins/visualize/public';
import { ISchemas } from 'src/plugins/vis_default_editor/public';
import { TriggerContextMapping } from '../../../ui_actions/public';
import { Vis, VisParams, VisToExpressionAst, VisualizationControllerConstructor } from '../types';

export interface VisTypeOptions {
  showTimePicker: boolean;
  showQueryBar: boolean;
  showFilterBar: boolean;
  showIndexSelection: boolean;
  hierarchicalData: boolean;
}

export enum VisGroups {
  PROMOTED = 'promoted',
  TOOLS = 'tools',
  AGGBASED = 'aggbased',
}

/**
 * A visualization type representing one specific type of "classical"
 * visualizations (i.e. not Lens visualizations).
 */
export interface VisType<TVisParams = unknown> {
  /**
   * Visualization unique name
   */
  readonly name: string;
  /**
   * It is the displayed text on the wizard and the vis listing
   */
  readonly title: string;
  /**
   * If given, it will be diplayed on the wizard vis card as the main description.
   */
  readonly description?: string;
  /**
   * If given, it will be diplayed on the wizard vis card as a note in italic.
   */
  readonly note: string;
  /**
   * If given, it will return the supported triggers for this vis.
   */
  readonly getSupportedTriggers?: () => Array<keyof TriggerContextMapping>;

  /**
   * Some visualizations are created without SearchSource and may change the used indexes during the visualization configuration.
   * Using this method we can rewrite the standard mechanism for getting used indexes
   */
  readonly getUsedIndexPattern?: (visParams: VisParams) => IndexPattern[] | Promise<IndexPattern[]>;

  readonly isAccessible?: boolean;
  readonly requestHandler?: string | unknown;
  readonly responseHandler?: string | unknown;
  /**
   * It is the visualization icon, displayed on the wizard.
   */
  readonly icon?: IconType;
  /**
   * Except from an icon, an image can be passed
   */
  readonly image?: string;
  /**
   * Describes the visualization stage
   */
  readonly stage: 'experimental' | 'beta' | 'production';
  /**
   * Describes the experience group that the visualization belongs.
   * It can be on tools, aggregation based or promoted group.
   */
  readonly group: VisGroups;
  /**
   * If given, it will be displayed on the wizard instead of the title.
   * We use it because we want to differentiate the vis title from the
   * way it is presented on the wizard
   */
  readonly titleInWizard: string;
  readonly requiresSearch: boolean;
  readonly useCustomNoDataScreen: boolean;
  readonly hierarchicalData?: boolean | ((vis: { params: TVisParams }) => boolean);
  readonly inspectorAdapters?: Adapters | (() => Adapters);
  /**
   * When specified this visualization is deprecated. This function
   * should return a ReactElement that will render a deprecation warning.
   * It will be shown in the editor when editing/creating visualizations
   * of this type.
   */
  readonly getInfoMessage?: (vis: Vis) => React.ReactNode;

  readonly toExpressionAst?: VisToExpressionAst<TVisParams>;
  readonly visualization?: VisualizationControllerConstructor;

  readonly setup?: (vis: Vis<TVisParams>) => Promise<Vis<TVisParams>>;
  hidden: boolean;

  readonly schemas: ISchemas;

  readonly options: VisTypeOptions;

  /**
   * The editor that should be used to edit visualizations of this type.
   * If this is not specified the default visualize editor will be used (and should be configured via schemas)
   * and editorConfig.
   */
  readonly editor?: VisEditorConstructor;

  // TODO: The following types still need to be refined properly.
  readonly editorConfig: Record<string, any>;
  readonly visConfig: Record<string, any>;
}
