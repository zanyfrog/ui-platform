import source from './page.html?raw';
import css from './page.css?raw';
import metadata from './page.visual.json';
import { components, packages } from 'virtual:uip-visual-artifacts';
import { createVisualPage } from '@ui-platform/visual-artifacts/runtime';
import type { ArtifactMetadata } from '@ui-platform/visual-artifacts';
import { createApplicationDataServices } from '@uib/platform-core/application-data';
export const { render } = createVisualPage({source,css,metadata:metadata as ArtifactMetadata},{components,packages,services:createApplicationDataServices()});
