import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import Layout from "../components/layout/Layout";
import PageWrapper from "../components/common/PageWrapper";

// Lazy-load all pages for code splitting
const Home = lazy(() => import("../pages/Home"));
const LiveMap = lazy(() => import("../pages/LiveMap"));
const Reports = lazy(() => import("../pages/Reports"));
const ReportDetail = lazy(() => import("../pages/Reports/ReportDetail"));
const Statistics = lazy(() => import("../pages/Statistics"));
const About = lazy(() => import("../pages/About"));
const NotFound = lazy(() => import("../pages/NotFound"));

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <PageWrapper><Home /></PageWrapper>,
      },
      {
        path: "map",
        element: <PageWrapper><LiveMap /></PageWrapper>,
      },
      {
        path: "reports",
        element: <PageWrapper><Reports /></PageWrapper>,
      },
      {
        path: "reports/:id",
        element: <PageWrapper><ReportDetail /></PageWrapper>,
      },
      {
        path: "statistics",
        element: <PageWrapper><Statistics /></PageWrapper>,
      },
      {
        path: "about",
        element: <PageWrapper><About /></PageWrapper>,
      },
      {
        path: "*",
        element: <PageWrapper><NotFound /></PageWrapper>,
      },
    ],
  },
]);

export default router;
