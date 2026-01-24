import React from "react";
import { BrowserRouter as Router, Route, Routes, Outlet } from "react-router-dom";

import Home from "@pages/Home/Home";
import Applications from "@pages/Home/Applications/Applications";
import Blogs from "@pages/Home/Blog/Blogs";
import BlogDetails from "@pages/Home/Blog/BlogDetails";
import AboutUs from "@pages/Home/AboutUs/AboutUs";

import UserProfile from "@pages/Profile/userProfile/UserProfile";
import ProfileApplications from "@pages/Profile/ProfileApplications/ProfileApplications";
import ProfileApplicationDrafts from "@profile/ProfileApplicationDrafts/ProfileApplicationDrafts";
import AppManagement from "@pages/Profile/AppManagement/AppManagement";
import EditProfile from "@pages/Profile/userProfile/EditProfile/EditProfile";
import MyPurchases from "@pages/Profile/MyPurchases/MyPurchases";
import ApplicationHistory from "@pages/Profile/ApplicationHistory/ApplicationHistory";
import CardsPayments from "@pages/Profile/CardsPayments/CardsPayments";
import EarningsPayouts from "@pages/Profile/Earnings&Payouts/Earnings&Payouts";
import ManagePayoutMethods from "@pages/Profile/Earnings&Payouts/ManagePayoutMethods/ManagePayoutMethods";

import Login from "@pages/Auth/Login/Login";
import SignUp from "@pages/Auth/SignUp/SignUp";
import VerifyIdentity from "@pages/Auth/VerifyIdentity/VerifyIdentity";
import ForgotPassword from "@pages/Auth/ForgotPassword/ForgotPassword";
import CreateNewPassword from "@pages/Auth/CreateNewPassword/CreateNewPassword";

import RequireAuth from "@pages/Auth/RequireAuth";
import { AuthUserProvider } from "@context/AuthUserContext";
import SiteLayout from "@layouts/SiteLayout";

const AuthLayout = () => (
  <div className="container">
    <Outlet />
  </div>
);

const App = () => {
  return (
    <Router>
      <AuthUserProvider>
        <Routes>
          <Route path="/" element={<SiteLayout />}>
            <Route index element={<Home />} />
            <Route path="applications" element={<Applications />} />
            <Route path="about-us" element={<AboutUs />} />
            <Route path="blogs" element={<Blogs />} />
            <Route path="blog/blogDetails" element={<BlogDetails />} />

            <Route element={<RequireAuth />}>
              <Route path="profile">
                <Route index element={<UserProfile />} />
                <Route path="apps" element={<ProfileApplications />} />
                <Route path="drafts" element={<ProfileApplicationDrafts />} />
                <Route path="appManagement" element={<AppManagement />} />
                <Route path="MyPurchases" element={<MyPurchases />} />
                <Route path="ApplicationHistory" element={<ApplicationHistory />} />
                <Route path="Earnings&Payouts" element={<EarningsPayouts />} />
                <Route path="ManagePayoutMethods" element={<ManagePayoutMethods />} />
                <Route path="CardsPayments" element={<CardsPayments />} />
                <Route path="edit" element={<EditProfile />} />
              </Route>
            </Route>
          </Route>

          <Route path="/auth" element={<AuthLayout />}>
            <Route path="login" element={<Login />} />
            <Route path="sign-up" element={<SignUp />} />
            <Route path="verify-identity" element={<VerifyIdentity />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="create-new-password" element={<CreateNewPassword />} />
          </Route>
        </Routes>
      </AuthUserProvider>
    </Router>
  );
};

export default App;
