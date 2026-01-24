import React from "react";
import { Outlet } from "react-router-dom";

import HomeNavbarDesktop from "@components/HomeNavBar/HomeNavbarDesktop";
import HomeNavbarMobile from "@components/HomeNavBar/HomeNavbarMobile";
import MemberNavbarDesktop from "@components/MemberNavbar/MemberNavbarDesktop";
import MemberNavbarMobile from "@components/MemberNavbar/MemberNavbarMobile";

import Footer from "@components/Footer/Footer";
import ContactUs from "@components/ContactUs/ContactUs";
import ProcessingModal from "@pages/ProcessingModal/ProcessingModal";

import { useAuthUser } from "@context/AuthUserContext";

const SiteLayout = () => {
  const { isSignedIn, loading, authBusy } = useAuthUser();

  if (loading || authBusy) {
    return <ProcessingModal />;
  }

  return (
    <section className="container">
      {isSignedIn ? (
        <>
          <MemberNavbarDesktop />
          <MemberNavbarMobile />
        </>
      ) : (
        <>
          <HomeNavbarDesktop />
          <HomeNavbarMobile />
        </>
      )}

      <Outlet />

      {!isSignedIn && (
        <>
          <ContactUs />
          <Footer />
        </>
      )}
    </section>
  );
};

export default SiteLayout;
