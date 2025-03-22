import { ResponseToolkit, Server } from "@hapi/hapi";
import * as aboutUsEndpoint from "./endpoints/about";
import * as articleEndpoints from "./endpoints/article";
import * as chemicalLinksEndpoints from "./endpoints/chemical-links";
import * as contactUsEndpoints from "./endpoints/contact-us";
import * as defaultPage from "./endpoints/default";
import * as generateReportsEndpoints from "./endpoints/generate-reports";
import * as latestIssuesEndpoints from "./endpoints/latest-issues";
import * as newsEndpoints from "./endpoints/news";
import * as searchDatabaseEndpoints from "./endpoints/search-engine";
import * as statDbEndpoints from "./endpoints/statdb";
import * as userEndpoints from "./endpoints/subscription";
import * as upcomingEventsEndpoints from "./endpoints/upcoming-events";
import * as userProfileEndpoints from "./endpoints/user";
import * as loginOptions from "./endpoints/Admin/Login"
import { addLinkRedirectHandler, deleteLinkHandler, editLinkRedirectHandler, getLinksHandler, updateLinkDisplayHandler } from "./endpoints/Admin/links/links";
import { addEventHandler,  deleteEventHandler,  getEventByIdHandler, getEventsHandler, updateEventDisplayHandler, updateEventHandler } from "./endpoints/Admin/events/events";
import { createUserHandler, deleteUserHandler, getAllUsersHandler, getUserByIdHandler, updateUserHandler, updateUserPaymentStatusHandler, updateUserStatusHandler } from "./endpoints/Admin/users/users";
import { getUserAccessInfoHandler, updateUserAccessHandler } from "./endpoints/Admin/users/usersaccess";
import { changePasswordOptions } from "./endpoints/Admin/chnagepass/changepass";
import { addProductOptions, getProductsOptions, updateProductDisplayOptions } from "./endpoints/Admin/products/products";
import { addCompanyOptions, getCompaniesOptions, getCountriesOptions, updateCompanyDisplayOptions } from "./endpoints/Admin/company/company";
import { deleteContactOptions, getAllContactsOptions, getPaginatedContactsOptions } from "./endpoints/Admin/contact/contact";
import { getOptionsHandler, getPriceHandler, getPriceOptionsHandler, updatePriceHandler } from "./endpoints/Admin/costmanagement/cost";
import { excelImportOptions } from "./endpoints/Admin/excelImport/excelimport";
import { addSearchKeywordOptions, deleteSearchKeywordOptions, getSearchKeywordsOptions, toggleSearchKeywordOptions, updateSearchKeywordOptions } from "./endpoints/Admin/search/search";
import { createOrUpdateIssueOptions, getInitialDataOptions, getIssueOptions } from "./endpoints/Admin/issues/issues";
import { addArticleHandler, deleteArticleHandler, deleteBulkArticlesHandler, getAllArticlesHandler, getArticleByIdHandler, updateArticleHandler, updateScrollingStatusHandler } from "./endpoints/Admin/articles/articles";
import { addPageContentOptions, deletePageContentOptions, getPageContentOptions, getPagesOptions, updatePageContentOptions } from "./endpoints/Admin/pageContent/pageContent";
import { addNewsOptions, deleteNewsOptions, getAllNewsOptions, getNewsByIdOptions, toggleSampleStatusOptions, updateNewsOptions } from "./endpoints/Admin/MonthlyNews/monthlyNews";
import { newsHandlers } from "./endpoints/Admin/russianmethanol/russianMethanol";

export const setupRoutes = (server: Server) => {
  //Default Page
  server.route({
    method: "GET",
    path: "/default",
    options: defaultPage.getDefaultPageContentOptions,
  });

  

  //Registration & Authentication
  server.route({
    method: ["POST"],
    path: "/user/login",
    options: userEndpoints.signInUserOptions,
  });

  server.route({
    method: "POST",
    path: "/user/registration/signup",
    options: userEndpoints.signUpUserOptions,
  });

  server.route({
    method: "POST",
    path: "/user/calculate/subscription/total/bill",
    options: userEndpoints.getSubscriptionBillTotalOptions,
  });

  //Password Manager
  server.route({
    method: "POST",
    path: "/user/password/manager",
    options: userEndpoints.passwordManagerOptions,
  });

  //Latest Issues
  server.route({
    method: "GET",
    path: "/latest/issues",
    options: latestIssuesEndpoints.getLatestIssuesOptions,
  });

  //Search Database
  server.route({
    method: "GET",
    path: "/search/database",
    options: searchDatabaseEndpoints.searchDatabaseOptions,
  });

  //Article
  server.route({
    method: "GET",
    path: "/article",
    options: articleEndpoints.getArticleByIdOptions,
  });

  //News
  server.route({
    method: "GET",
    path: "/shownews",
    options: newsEndpoints.getPdfNewsOptions,
  });

  server.route({
    method: "GET",
    path: "/monthlyNews",
    options: newsEndpoints.getMonthlyNewsOptions,
  });

  //about us
  server.route({
    method: "GET",
    path: "/aboutUs",
    options: aboutUsEndpoint.getAboutUsPageContent,
  });

  //Contact Us
  server.route({
    method: 'GET',
    path: '/contactUs/content',
    options: contactUsEndpoints.getContactUsPageContent,
  });

  server.route({
    method: 'POST',
    path: '/contactUs/sendMail',
    options: contactUsEndpoints.sendContactUsMail,
  });

  //upcoming events
  server.route({
    method: 'GET',
    path: '/upcoming/events',
    options: upcomingEventsEndpoints.getUpcomingEventsOptions,
  });

  //chemical links
  server.route({
    method: 'GET',
    path: '/chemical/links',
    options: chemicalLinksEndpoints.getChemicalLinksOptions,
  });

  //User
  server.route({
    method: 'GET',
    path: '/user/profile/info',
    options: userProfileEndpoints.getUserInfoOptions,
  });

  server.route({
    method: 'POST',
    path: '/user/profile/info/update',
    options: userProfileEndpoints.updateUserInfoOptions,
  });

  //statdb
  server.route({
    method: 'GET',
    path: '/statdb/content',
    options: statDbEndpoints.getStatDbOptions,
  });

  //statdb reports
  server.route({
    method: 'GET',
    path: '/statdb/report-chart1',
    options: generateReportsEndpoints.getReportChart1Options,
  });

  server.route({
    method: 'GET',
    path: '/statdb/report-chart2',
    options: generateReportsEndpoints.getReportChart2Options,
  });

  server.route({
    method: 'GET',
    path: '/statdb/report-chart3',
    options: generateReportsEndpoints.getReportChart3Options,
  });

  server.route({
    method: 'GET',
    path: '/statdb/report-fin-chart2',
    options: generateReportsEndpoints.getFinancialReportChart2Options,
  });

  server.route({
    method: 'GET',
    path: '/statdb/report-fin-chart3',
    options: generateReportsEndpoints.getReportFinChart3Options,
  });

  server.route({
    method: 'GET',
    path: '/statdb/report-russia-domestic',
    options: generateReportsEndpoints.getRussianDomesticSalesOptions,
  });

  server.route({
    method: 'GET',
    path: '/statdb/report-russia-exports',
    options: generateReportsEndpoints.getRussianExportSalesOptions,
  });

  server.route({
    method: 'GET',
    path: '/statdb/report-polish-chem',
    options: generateReportsEndpoints.getPolishChemicalProductionOptions,
  });

  server.route({
    method: 'GET',
    path: '/statdb/report-polish-chem-export',
    options: generateReportsEndpoints.getPolishChemicalExportOptions,
  });

  server.route({
    method: 'GET',
    path: '/statdb/report-polish-chem-import',
    options: generateReportsEndpoints.getPolishChemicalImportOptions,
  });

  server.route({
    method: 'GET',
    path: '/statdb/report-olefins-polyolefins',
    options: generateReportsEndpoints.getOlefinsPolyolefinReportOptions,
  });
  server.route({
    method: 'POST',
    path: '/admin/login',
    options: loginOptions.loginOptions
  });
  
  server.route({
    method: 'GET',
    path: '/admin/links',
    // options: { auth: "admin" },
    handler: getLinksHandler
  });
  
  server.route({
    method: "PUT",
    path: "/admin/links/display",
    // options: {
    //   auth: "admin",
    //   validate: {
    //     payload: Joi.object({
    //       lkId: Joi.string().required(),
    //       display: Joi.string().valid("0", "1").required()
    //     })
    //   }
    // },
    handler: updateLinkDisplayHandler
  });
  
  server.route({
    method: "DELETE",
    path: "/admin/links/{lkId}",
    // options: {
    //   auth: "admin",
    //   validate: {
    //     params: Joi.object({
    //       lkId: Joi.string().required()
    //     })
    //   }
    // },
    handler: deleteLinkHandler
  });
  
  server.route({
    method: "GET",
    path: "/admin/links/add",
    // options: { auth: "admin" },
    handler: addLinkRedirectHandler
  });
  
  server.route({
    method: "GET",
    path: "/admin/links/edit/{lkId}",
    // options: {
    //   auth: "admin",
    //   validate: {
    //     params: Joi.object({
    //       lkId: Joi.string().required()
    //     })
    //   }
    // },
    handler: editLinkRedirectHandler
  });



  server.route({
    method: 'GET',
    path: '/api/admin/events',
    handler: getEventsHandler
  })


  server.route({
    method: 'PUT',
    path: '/api/admin/events/display',
    handler: updateEventDisplayHandler
  })


  server.route({
    method: 'GET',
    path: '/api/admin/events/{evId}',
    handler: getEventByIdHandler
  })


  server.route({
    method: 'PUT',
    path: '/api/admin/events/{evId}',
    handler: updateEventHandler
  })


  server.route({
    method: 'DELETE',
    path: '/api/admin/events/{evId}',
    handler: deleteEventHandler
  
  })


  server.route({
    
    method: 'POST',
    path: '/api/admin/events',
    handler: addEventHandler
  })



  server.route({
    method: "GET",
    path: "/admin/users",
    // options: { auth: "admin" },
    handler: getAllUsersHandler
  });

  // Get user by ID
  server.route({
    method: "GET",
    path: "/admin/users/{userId}",
    // options: {
    //   auth: "admin",
    //   validate: {
    //     params: Joi.object({
    //       userId: Joi.string().required()
    //     })
    //   }
    // },
    handler: getUserByIdHandler
  });

    // Create new user
    server.route({
      method: "POST",
      path: "/admin/users",
      // options: {
      //   auth: "admin",
      //   validate: {
      //     payload: Joi.object({
      //       // Add validation schema here
      //     })
      //   }
      // },
      handler: createUserHandler
    });

    // Update user
    server.route({
      method: "PUT",
      path: "/admin/users/{userId}",
      // options: {
      //   auth: "admin",
      //   validate: {
      //     params: Joi.object({
      //       userId: Joi.string().required()
      //     }),
      //     payload: Joi.object({
      //       // Add validation schema here
      //     })
      //   }
      // },
      handler: updateUserHandler
    });

    // Delete user
    server.route({
      method: "DELETE",
      path: "/admin/users/{userId}",
      // options: {
      //   auth: "admin",
      //   validate: {
      //     params: Joi.object({
      //       userId: Joi.string().required()
      //     })
      //   }
      // },
      handler: deleteUserHandler
    });

    // Update user status
    server.route({
      method: "PUT",
      path: "/admin/users/{userId}/status",
      // options: {
      //   auth: "admin",
      //   validate: {
      //     params: Joi.object({
      //       userId: Joi.string().required()
      //     }),
      //     payload: Joi.object({
      //       status: Joi.boolean().required()
      //     })
      //   }
      // },
      handler: updateUserStatusHandler
    });

    // Update user payment status
    server.route({
      method: "PUT",
      path: "/admin/users/{userId}/payment",
      // options: {
      //   auth: "admin",
      //   validate: {
      //     params: Joi.object({
      //       userId: Joi.string().required()
      //     }),
      //     payload: Joi.object({
      //       paid: Joi.boolean().required()
      //     })
      //   }
      // },
      handler: updateUserPaymentStatusHandler
    });


    server.route({
      method: "GET",
      path: "/admin/users/{userId}/access",
      // options: {
      //   auth: "admin",
      //   validate: {
      //     params: Joi.object({
      //       userId: Joi.string().required()
      //     })
      //   }
      // },
      handler: getUserAccessInfoHandler
    });

    // Update user access
    server.route({
      method: "PUT",
      path: "/admin/users/{userId}/access",
      // options: {
      //   auth: "admin",
      //   validate: {
      //     params: Joi.object({
      //       userId: Joi.string().required()
      //     }),
      //     payload: Joi.object({
      //       username: Joi.string(),
      //       mnewsAccess: Joi.boolean(),
      //       mnewsDuration: Joi.number(),
      //       additionalCopiesAccess: Joi.boolean(),
      //       additionalCopiesCount: Joi.number(),
      //       additionalCopiesEmails: Joi.array().items(Joi.string().email()),
      //       seaAccess: Joi.boolean(),
      //       seaDuration: Joi.number(),
      //       sdaAccess: Joi.boolean(),
      //       sdaDuration: Joi.number(),
      //       otherReportsAccess: Joi.boolean(),
      //       centralEuropeanReport: Joi.boolean(),
      //       polishChemicalReport: Joi.boolean(),
      //       removeMnews: Joi.boolean(),
      //       removeAdditionalCopies: Joi.boolean(),
      //       removeSea: Joi.boolean(),
      //       removeSda: Joi.boolean(),
      //       removeOtherReports: Joi.boolean()
      //     })
      //   }
      // },
      handler: updateUserAccessHandler
    });



    server.route({
      method: 'POST',
      path: '/admin/change-password',
      options: changePasswordOptions
    });



    // Product management routes
    server.route({
      method: "GET",
      path: "/admin/products",
      options: getProductsOptions
    });
    
    server.route({
      method: "PUT",
      path: "/admin/products/display",
      options: updateProductDisplayOptions
    });
    
    server.route({
      method: "POST",
      path: "/admin/products",
      options: addProductOptions
    });


    server.route({
      method: "GET",
      path: "/admin/companies",
      options: getCompaniesOptions
    });
    
    server.route({
      method: "PUT",
      path: "/admin/companies/display",
      options: updateCompanyDisplayOptions
    });
    
    server.route({
      method: "POST",
      path: "/admin/companies",
      options: addCompanyOptions
    });
    
    // Countries routes (for dropdown in Add Company form)
    server.route({
      method: "GET",
      path: "/admin/countries",
      options: getCountriesOptions
    });


    server.route({
        method: "GET",
        path: "/admin/contacts",
        options: getAllContactsOptions
    })


    server.route({
      method: "GET",
      path: "/admin/contacts/paginated",
      options: getPaginatedContactsOptions
    })

    server.route({
      method: "DELETE",
      path: "/admin/contacts/{id}",
      options: deleteContactOptions
    })


    server.route({
      
        method: "GET",
        path: "/api/admin/cost-management/options",
        options: {
          description: "Get all registration options",
          tags: ["api", "Cost Management"],
          handler: getOptionsHandler
        }
    })

    server.route({
      method: "GET",
      path: "/api/admin/cost-management/options/{optionId}/prices",
      options: {
        description: "Get price options for a specific registration option",
        tags: ["api", "Cost Management"],
        },
        handler: getPriceOptionsHandler
    })

    server.route({
      method: "GET",
      path: "/api/admin/cost-management/prices/{priceId}",
      options: {
        description: "Get price for a specific price option",
        tags: ["api",  "Cost Management"],
        handler: getPriceHandler
      }
    })


    server.route({
      method: "PUT",
      path: "/api/admin/cost-management/prices/{priceId}",
      options: {
        description: "Update price for a specific price option",
        tags: ["api", "Cost Management"],
        handler: updatePriceHandler
      }
    })



  server.route({
    method: 'POST',
    path: '/admin/excel-import',
    options: excelImportOptions
  })



  server.route({ 
    method: 'GET',
    path: '/admin/search-keywords',
    options: getSearchKeywordsOptions
  })


  server.route({
    method: 'POST',
    path: '/admin/search-keywords',
    options: addSearchKeywordOptions
  })


  server.route({
    method: 'PUT',
    path: '/admin/search-keywords/{id}',
    options: updateSearchKeywordOptions
  })


  server.route({
    method: 'PUT',
    path: '/admin/search-keywords/{id}/toggle',
    options: toggleSearchKeywordOptions
  
  })


  server.route({
    method: 'DELETE',
    path: '/admin/search-keywords/{id}',
    options: deleteSearchKeywordOptions

  })


  server.route({
    method: "GET",
    path: "/api/issues/initial-data",
    options: getInitialDataOptions
  });
  
  // Get issue by year and month
  server.route({
    method: "GET",
    path: "/api/issues/{year}/{month}",
    options: getIssueOptions
  });
  
  // Create or update an issue
  server.route({
    method: "POST",
    path: "/api/issues",
    options: createOrUpdateIssueOptions
  });

  server.route({
    method: "GET",
    path: "/admin/articles",
    options: {
      description: "Get all articles",
      tags: ["api", "Articles"],
      handler: getAllArticlesHandler
    }
  });

  server.route({
    method: "GET",
    path: "/admin/articles/{id}",
    options: {
      description: "Get article by ID",
      tags: ["api", "Articles"],
      handler: getArticleByIdHandler
    }
  });

  server.route({
    method: "POST",
    path: "/admin/articles",
    options: {
      description: "Add new article",
      tags: ["api", "Articles"],
      handler: addArticleHandler
    }
  });

  server.route({
    method: "PUT",
    path: "/admin/articles/{id}",
    options: {
      description: "Update article",
      tags: ["api", "Articles"],
      handler: updateArticleHandler
    }
  });

  server.route({
    method: "DELETE",
    path: "/admin/articles/{id}",
    options: {
      description: "Delete article",
      tags: ["api", "Articles"],
      handler: deleteArticleHandler
    }
  });

  server.route({
    method: "POST",
    path: "/admin/articles/delete-bulk",
    options: {
      description: "Delete multiple articles",
      tags: ["api", "Articles"],
      handler: deleteBulkArticlesHandler
    }
  });

  server.route({
    method: "PATCH",
    path: "/admin/articles/{id}/scrolling",
    options: {
      description: "Update article scrolling status",
      tags: ["api", "Articles"],
      handler: updateScrollingStatusHandler
    }
  });


  server.route({
    method: 'GET',
    path: '/api/admin/pages',
    options: getPagesOptions
  });

  server.route({
    method: 'GET',
    path: '/api/admin/pagecontent/{pageId}',
    options: getPageContentOptions
  });

  server.route({
    method: 'PUT',
    path: '/api/admin/pagecontent/update',
    options: updatePageContentOptions
  });

  server.route({
    method: 'POST',
    path: '/api/admin/pagecontent/add',
    options: addPageContentOptions
  });

  server.route({
    method: 'DELETE',
    path: '/api/admin/pagecontent/{contentId}',
    options: deletePageContentOptions
  });
  

  server.route({
    method: 'GET',
    path: '/api/admin/news',
    options: getAllNewsOptions
  });

  // Get news by ID
  server.route({
    method: 'GET',
    path: '/api/admin/news/{id}',
    options: getNewsByIdOptions
  });

  // Add new news
  server.route({
    method: 'POST',
    path: '/api/admin/news',
    options: addNewsOptions
  });

  // Update news
  server.route({
    method: 'PUT',
    path: '/api/admin/news/{id}',
    options: updateNewsOptions
  });

  // Delete news
  server.route({
    method: 'DELETE',
    path: '/api/admin/news/{id}',
    options: deleteNewsOptions
  });

  // Toggle sample status
  server.route({
    method: 'PATCH',
    path: '/api/admin/news/{id}/sample',
    options: toggleSampleStatusOptions
  });


  server.route({
    method: "GET",
    path: "/api/admin/russiannews",
    options: {
      description: "Get all news items",
      tags: ["api", "News"],
      handler: newsHandlers.getAllRussianNews,
    },
  }); 


  server.route({
    method: "GET",
    path: "/api/admin/russiannews/{id}",
    options: {
      description: "Get news by ID",
      tags: ["api", "News"],
      handler: newsHandlers.getRussianNewsById
    }
  })

  server.route({
    method: "POST",
    path: "/api/admin/russiannews",
    options: {
      description: "Add new news",
      tags: ["api", "News"],
      payload: {
        output: "stream",
        parse: true,
        multipart: true,
        maxBytes: 20 * 1024 * 1024 
      },
      handler: newsHandlers.addRussianNews
    }
  })


  server.route({
    method: "PUT",
    path: "/api/admin/russiannews/{id}",
    options: {
      description: "Update news",
      tags: ["api", "News"],
      payload: {
        output: "stream",
        parse: true,
        multipart: true,
        maxBytes: 20 * 1024 * 1024 
      },
      handler: newsHandlers.updateRussianNews
    }
  })



  server.route({
    method: "PATCH",
    path: "/api/admin/russiannews/{id}/sample",
    options: {
      description: "Update news sample status",
      tags: ["api", "News"],
      handler: newsHandlers.updateRussianSampleStatus
    }
  })


  server.route({
    method: "DELETE",
    path: "/api/admin/russiannews/{id}",
    options: {
      description: "Delete news",
      tags: ["api", "News"],
      handler: newsHandlers.deleteRussianNews
    }
  })
  };
