import { ErrorPage } from './ErrorPage';
import App from './App';
import { WelcomePage } from './WelcomePage';
import { DemonstrationsPage } from './DemonstrationsPage';
import { DemonstrationId, getDemonstrationCatalog } from './demonstrations';

const graphRoute = (id: DemonstrationId) => async () => {
    const [{GraphRoute}, {graphFactories}] = await Promise.all([
        import('./graphs/base/GraphRoute'),
        import('./graphs/graphFactories'),
    ]);
    return {Component: () => <GraphRoute create={graphFactories[id]}/>};
};

const routes = [{
    path: '/bezeg-2.0', element: <App/>, errorElement: <ErrorPage/>,
    children: [
        {index: true, element: <WelcomePage/>},
        {path: '/bezeg-2.0/demonstrations', element: <DemonstrationsPage/>},
        {path: '/bezeg-2.0/learn', lazy: async () => {
            const {LearningPage} = await import('./learning/LearningPage');
            return {Component: LearningPage};
        }},
        {path: '/bezeg-2.0/learn/bezier-curves', lazy: async () => {
            const {ChapterPage} = await import('./learning/ChapterPage');
            return {Component: ChapterPage};
        }},
        {path: '/bezeg-2.0/learn/*', element: <ErrorPage embedded/>},
        ...getDemonstrationCatalog().demonstrations.map(({id, path}) => ({
            path, lazy: graphRoute(id),
        })),
    ],
}];

export default routes;
